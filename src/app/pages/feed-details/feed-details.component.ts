import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService, ViewportBounds } from '../../services/api.service';
import { GTFSRoute } from '../../models/gtfsroute';
import { GTFSSearchStop } from '../../models/gtfssearchstop';
import { VehiclePosition } from '../../models/vehicle-position';
import { LeafletMarkerClusterModule } from '@bluehalo/ngx-leaflet-markercluster';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';
// Order is apparently important here. This should be imported after bluehalo-ngx-leaflet things
import {
    FeatureGroup,
    Map,
    LatLngBounds,
    latLng,
    Layer,
    tileLayer,
    featureGroup,
    circle,
    Popup,
    MarkerClusterGroup,
    MarkerClusterGroupOptions,
} from 'leaflet';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { CommonModule } from '@angular/common';
import { interval, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Alert } from '../../models/gtfsalert';

const STOP_LIMIT = 8000;
const POSITION_LIMIT = 2000;
const POSITION_REFRESH_MS = 10000;
const MOVE_DEBOUNCE_MS = 400;

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-feed-details',
    imports: [LeafletModule, LeafletMarkerClusterModule, LoadingComponent, RouterModule, CommonModule],
    templateUrl: './feed-details.component.html',
    styleUrl: './feed-details.component.scss',
})
export class FeedDetailsComponent implements OnInit, OnDestroy {
    private intervalSubscription: Subscription | undefined;
    private viewportSubscription: Subscription | undefined;
    private viewportRequests = new Subject<void>();

    loading: boolean = false;
    stopsLoading: boolean = false;
    selectedFeed: string = 'Unknown';
    routes: GTFSRoute[] | undefined;
    stops: GTFSSearchStop[] | undefined;
    vehiclePositions: VehiclePosition[] | undefined;
    alerts: Alert[] | undefined;
    onlyRealTime: boolean = false;
    lastLoad: Date = new Date();
    vehiclesLayer!: FeatureGroup;
    map!: Map;
    markerLayers!: FeatureGroup;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    clusterGroup: MarkerClusterGroup = new MarkerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: true,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 13,
        removeOutsideVisibleBounds: true,
        animate: true,
        chunkedLoading: true,
    });

    options = {
        zoom: 7,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[];

    private hasFittedToData: boolean = false;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
    }

    private startPositionLoop() {
        this.intervalSubscription = interval(POSITION_REFRESH_MS).subscribe(() => {
            this.loadPositionsInView();
        });
    }

    ngOnInit(): void {
        this.markerLayers = featureGroup();
        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle('Feed ' + this.selectedFeed);
            this.hasFittedToData = false;

            var realtimeData = this.route.snapshot.queryParamMap.get('realtime');
            if (realtimeData != null) {
                this.onlyRealTime = Boolean(JSON.parse(realtimeData));
            }

            if (!this.onlyRealTime) {
                this.apiService.GetFeedRoutes(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.routes = data;
                    },
                });
                this.apiService.GetFeedAlerts(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.alerts = data;
                    },
                    error: (err) => {
                        console.error('Error fetching feed alerts:', err);
                        this.alerts = [];
                    },
                });
            }

            this.startPositionLoop();
        });

        this.loading = true;

        this.vehiclesLayer = featureGroup();

        this.layers.push(this.markerLayers, this.vehiclesLayer, this.clusterGroup);

        // Reload the stops when the user pans/zooms the map (debounced)
        this.viewportSubscription = this.viewportRequests.pipe(debounceTime(MOVE_DEBOUNCE_MS)).subscribe(() => {
            this.loadStopsInView();
        });
    }

    onMapReady(map: Map) {
        this.map = map;
        this.invalidateMap();
        this.map.on('moveend', () => this.viewportRequests.next());
        // Initial load: only what is inside the current viewport
        this.loadStopsInView();
        this.loadPositionsInView();
    }

    private currentViewport(): ViewportBounds | undefined {
        if (!this.map) {
            return undefined;
        }
        const bounds = this.map.getBounds();
        return {
            minLat: bounds.getSouth(),
            maxLat: bounds.getNorth(),
            minLon: bounds.getWest(),
            maxLon: bounds.getEast(),
        };
    }

    private loadStopsInView() {
        if (this.onlyRealTime) {
            return;
        }
        this.stopsLoading = true;
        this.apiService.GetFeedStops(this.selectedFeed, this.currentViewport(), STOP_LIMIT).subscribe({
            next: (data) => {
                this.stops = data;
                this.replaceStopsOnMap(data);
                this.stopsLoading = false;
                this.fitToDataOnce();
            },
            error: (err) => {
                console.error('Error fetching feed stops:', err);
                this.stopsLoading = false;
            },
        });
    }

    private loadPositionsInView() {
        this.loading = true;
        this.apiService.GetFeedPositions(this.selectedFeed, this.currentViewport(), POSITION_LIMIT).subscribe({
            next: (data) => {
                this.vehiclePositions = data;
                this.addVehiclesToMap(data);
                this.loading = false;
                this.lastLoad = new Date();
                this.fitToDataOnce();
            },
            error: (err) => {
                console.error('Error fetching feed positions:', err);
                this.loading = false;
            },
        });
    }

    private fitToDataOnce() {
        if (this.hasFittedToData || !this.map) {
            return;
        }
        const bounds = this.combinedDataBounds();
        if (bounds && bounds.isValid()) {
            this.hasFittedToData = true;
            this.map.fitBounds(bounds, { padding: [30, 30] });
        }
    }

    private combinedDataBounds(): LatLngBounds | undefined {
        const groups: FeatureGroup[] = [];
        if (this.clusterGroup.getLayers().length > 0) {
            groups.push(this.clusterGroup as unknown as FeatureGroup);
        }
        if (this.vehiclesLayer && this.vehiclesLayer.getLayers().length > 0) {
            groups.push(this.vehiclesLayer);
        }
        if (groups.length === 0) {
            return undefined;
        }
        return featureGroup(groups).getBounds();
    }

    private replaceStopsOnMap(stops: GTFSSearchStop[]) {
        this.clusterGroup.clearLayers();
        stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 25 });
                var popup = new Popup();
                popup.setContent('<a href=\"/stops/' + encodeURIComponent(stop.id) + '/' + encodeURIComponent(stop.stopType) + '\">' + stop.name + '</a>');
                stopLayer.bindPopup(popup);
                this.clusterGroup.addLayer(stopLayer);
            });
        });
        this.invalidateMap();
    }

    addVehiclesToMap(vehicles: VehiclePosition[]) {
        this.vehiclesLayer?.clearLayers();
        vehicles.forEach((vehicle) => {
            if (vehicle.longitude && vehicle.latitude) {
                var vehicleLayer = circle([vehicle.latitude, vehicle.longitude], { radius: 40, color: 'green' });

                var popup = new Popup();
                var popupText = `Known as: ${vehicle.id} </br> Measured at: ${vehicle.measurementTime} </br>`;
                var vehicleName = vehicle.vehicleLabel ?? vehicle.vehicleLicensePlate ?? vehicle.vehicleId;
                if (vehicleName != undefined) {
                    popupText += `Vehicle: ${vehicleName} </br>`;
                }
                if (vehicle.tripId != undefined) {
                    popupText += `Trip: <a href='/trip/${encodeURIComponent(vehicle.tripId)}'> ${vehicle.tripId}</a>`;
                } else {
                    popupText += `Trip: no trip configured`;
                }
                popup.setContent(popupText);
                vehicleLayer.bindPopup(popup);
                this.vehiclesLayer.addLayer(vehicleLayer);
            }
        });
        this.clusterGroup.removeLayer(this.vehiclesLayer);
    }

    invalidateMap(): void {
        this.map?.invalidateSize();
    }

    onResize(event: any) {
        this.invalidateMap();
    }

    ngOnDestroy() {
        this.intervalSubscription?.unsubscribe();
        this.viewportSubscription?.unsubscribe();
    }
}
