import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
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
import { FormsModule } from '@angular/forms';
import { interval, Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Alert } from '../../models/gtfsalert';

const POSITION_LIMIT = 2000;
const POSITION_REFRESH_MS = 10000;
const MOVE_DEBOUNCE_MS = 500;
const ROUTE_PAGE_SIZE = 25;
const ALERT_LIMIT = 50;

// How many stops to render per zoom level. Rendering thousands of circle layers is
// what freezes the page on massive feeds, so low zooms get a small, cheap set.
function stopLimitForZoom(zoom: number): number {
    if (zoom <= 7) return 800;
    if (zoom <= 8) return 1500;
    if (zoom <= 9) return 2500;
    if (zoom <= 10) return 4000;
    if (zoom <= 11) return 6000;
    if (zoom <= 12) return 8000;
    return 10000;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-feed-details',
    imports: [LeafletModule, LeafletMarkerClusterModule, LoadingComponent, RouterModule, CommonModule, FormsModule],
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

    routeFilter: string = '';
    routePage: number = 0;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    clusterGroup: MarkerClusterGroup = new MarkerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        disableClusteringAtZoom: 14,
        removeOutsideVisibleBounds: true,
        animate: true,
        chunkedLoading: true,
        maxClusterRadius: 60,
    } as MarkerClusterGroupOptions);

    options = {
        zoom: 7,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[];

    private hasFittedToData: boolean = false;
    private lastStopBounds: ViewportBounds | undefined;
    private lastStopZoom: number = -1;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
        private cdr: ChangeDetectorRef,
    ) {
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
    }

    get filteredRoutes(): GTFSRoute[] {
        const filter = this.routeFilter.trim().toLowerCase();
        if (!this.routes) {
            return [];
        }
        if (!filter) {
            return this.routes;
        }
        return this.routes.filter((r) =>
            (r.shortName ?? '').toLowerCase().includes(filter)
            || (r.longName ?? '').toLowerCase().includes(filter)
            || (r.agency ?? '').toLowerCase().includes(filter)
            || (r.type ?? '').toString().toLowerCase().includes(filter),
        );
    }

    get pagedRoutes(): GTFSRoute[] {
        const start = this.routePage * ROUTE_PAGE_SIZE;
        return this.filteredRoutes.slice(start, start + ROUTE_PAGE_SIZE);
    }

    get routePageCount(): number {
        return Math.max(1, Math.ceil(this.filteredRoutes.length / ROUTE_PAGE_SIZE));
    }

    onRouteFilterChange() {
        this.routePage = 0;
    }

    prevRoutePage() {
        if (this.routePage > 0) {
            this.routePage--;
        }
    }

    nextRoutePage() {
        if (this.routePage < this.routePageCount - 1) {
            this.routePage++;
        }
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
            this.lastStopBounds = undefined;
            this.lastStopZoom = -1;
            this.routeFilter = '';
            this.routePage = 0;

            var realtimeData = this.route.snapshot.queryParamMap.get('realtime');
            if (realtimeData != null) {
                this.onlyRealTime = Boolean(JSON.parse(realtimeData));
            }

            if (!this.onlyRealTime) {
                this.apiService.GetFeedRoutes(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.routes = data;
                        this.cdr.markForCheck();
                    },
                });
                this.apiService.GetFeedAlertsWithPagination(this.selectedFeed, ALERT_LIMIT, 0).subscribe({
                    next: (data) => {
                        this.alerts = data;
                        this.cdr.markForCheck();
                    },
                    error: (err) => {
                        console.error('Error fetching feed alerts:', err);
                        this.alerts = [];
                        this.cdr.markForCheck();
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
        // Initial load: only what is inside the current viewport, at a zoom-appropriate limit
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
        if (this.onlyRealTime || !this.map) {
            return;
        }
        const viewport = this.currentViewport();
        if (!viewport) {
            return;
        }
        const zoom = this.map.getZoom();
        // Skip the reload if neither zoom nor (roughly) the visible area changed
        if (viewport && this.lastStopBounds && zoom === this.lastStopZoom && this.boundsOverlapEnough(viewport, this.lastStopBounds)) {
            return;
        }
        this.lastStopBounds = viewport;
        this.lastStopZoom = zoom;

        this.stopsLoading = true;
        this.cdr.markForCheck();
        this.apiService.GetFeedStops(this.selectedFeed, viewport, stopLimitForZoom(zoom)).subscribe({
            next: (data) => {
                this.stops = data;
                this.replaceStopsOnMap(data);
                this.stopsLoading = false;
                this.cdr.markForCheck();
                this.fitToDataOnce();
            },
            error: (err) => {
                console.error('Error fetching feed stops:', err);
                this.stopsLoading = false;
                this.cdr.markForCheck();
            },
        });
    }

    private boundsOverlapEnough(a: ViewportBounds, b: ViewportBounds): boolean {
        const overlapLat = Math.min(a.maxLat, b.maxLat) - Math.max(a.minLat, b.minLat);
        const overlapLon = Math.min(a.maxLon, b.maxLon) - Math.max(a.minLon, b.minLon);
        const aLat = a.maxLat - a.minLat;
        const aLon = a.maxLon - a.minLon;
        return overlapLat > 0.5 * aLat && overlapLon > 0.5 * aLon;
    }

    private loadPositionsInView() {
        if (!this.map) {
            return;
        }
        this.loading = true;
        this.cdr.markForCheck();
        this.apiService.GetFeedPositions(this.selectedFeed, this.currentViewport(), POSITION_LIMIT).subscribe({
            next: (data) => {
                this.vehiclePositions = data;
                this.addVehiclesToMap(data);
                this.loading = false;
                this.lastLoad = new Date();
                this.cdr.markForCheck();
                this.fitToDataOnce();
            },
            error: (err) => {
                console.error('Error fetching feed positions:', err);
                this.loading = false;
                this.cdr.markForCheck();
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
        const layers: Layer[] = [];
        stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 25 });
                var popup = new Popup();
                popup.setContent('<a href=\"/stops/' + encodeURIComponent(stop.id) + '/' + encodeURIComponent(stop.stopType) + '\">' + stop.name + '</a>');
                stopLayer.bindPopup(popup);
                layers.push(stopLayer);
            });
        });
        // addLayers in one call is much cheaper than addLayer per marker
        this.clusterGroup.addLayers(layers);
        this.invalidateMap();
    }

    addVehiclesToMap(vehicles: VehiclePosition[]) {
        this.vehiclesLayer?.clearLayers();
        // Vehicle counts are small, so per-layer add is fine here (FeatureGroup has no addLayers)
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
