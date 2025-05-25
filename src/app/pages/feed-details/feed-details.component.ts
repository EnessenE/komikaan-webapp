import { Component, OnDestroy, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
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
import { interval, Subscription } from 'rxjs';
import { Alert } from '../../models/gtfsalert';

@Component({
    selector: 'app-feed-details',
    imports: [LeafletModule, LeafletMarkerClusterModule, LoadingComponent, RouterModule, CommonModule],
    templateUrl: './feed-details.component.html',
    styleUrl: './feed-details.component.scss',
})
export class FeedDetailsComponent implements OnInit, OnDestroy {
    private intervalSubscription: Subscription | undefined;

    loading: boolean = false;
    selectedFeed: string = 'Unknown';
    realtimeLayerId: number = -1;
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

    mapFitToBounds!: LatLngBounds;

    markerClusterOptions: MarkerClusterGroupOptions = {};

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
        zoom: 13,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[];

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
    }

    private startPositionLoop() {
        this.intervalSubscription = interval(10000).subscribe(() => {
            // We don't want to fit to bounds after the first init as the user can positions it to whatever they care about
            this.getFeedPositions(false);
        });
    }

    ngOnInit(): void {
        this.markerLayers = featureGroup();
        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle('Feed ' + this.selectedFeed);
            this.getFeedPositions(true);

            var realtimeData = this.route.snapshot.queryParamMap.get('realtime');
            if (realtimeData != null) {
                this.onlyRealTime = Boolean(JSON.parse(realtimeData));
            }
            this.startPositionLoop();

            if (!this.onlyRealTime) {
                this.apiService.GetFeedRoutes(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.routes = data;
                        this.loading = false;
                    },
                });
                this.apiService.GetFeedStops(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.stops = data;
                        this.addStopsToMap(data);
                        this.loading = false;
                    },
                });
                // Add this block to fetch alerts
                this.apiService.GetFeedAlerts(this.selectedFeed).subscribe({
                    next: (data) => {
                        this.alerts = data;
                        this.loading = false; // Set loading to false after all data is fetched
                    },
                    error: (err) => {
                        console.error('Error fetching feed alerts:', err);
                        this.alerts = []; // Set to empty array on error to avoid undefined issues in template
                        this.loading = false;
                    }
                });
            }
            console.log('Realtime only: ' + this.onlyRealTime);
        });

        this.loading = true;

        this.vehiclesLayer = featureGroup();

        this.layers.push(this.markerLayers, this.vehiclesLayer, this.clusterGroup);
    }

    private getFeedPositions(fitToBounds: boolean) {
        console.log('Getting feed positions');
        this.loading = true;
        this.apiService.GetFeedPositions(this.selectedFeed).subscribe({
            next: (data) => {
                this.vehiclePositions = data;
                this.addVehiclesToMap(data, fitToBounds);
                this.loading = false;
                this.lastLoad = new Date();
            },
            error: (err) => {
                console.error('Error fetching feed positions:', err);
                this.loading = false;
            },
        });
    }

    addStopsToMap(stops: GTFSSearchStop[]) {
        stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 25 });
                var popup = new Popup();
                popup.setContent('<a href="/stops/' + stop.id + '/' + stop.stopType + '">' + stop.name + '</a>');
                stopLayer.bindPopup(popup);
                this.clusterGroup.addLayer(stopLayer);
            });
        });
        this.invalidateMap();
        console.log('Fitting bounds to markerLayers...');
        this.map.fitBounds(this.clusterGroup.getBounds());
        console.log('bounds');
    }

    addVehiclesToMap(vehicles: VehiclePosition[], fitToBounds: boolean) {
        this.vehiclesLayer?.clearLayers();
        vehicles.forEach((vehicle) => {
            if (vehicle.longitude && vehicle.latitude) {
                var vehicleLayer = circle([vehicle.latitude, vehicle.longitude], { radius: 40, color: 'green' });

                var popup = new Popup();
                var popupText = `Known as: ${vehicle.id} </br> Measured at: ${vehicle.measurementTime} </br>`;
                if (vehicle.tripId != undefined) {
                    popupText += `Trip: <a href='/trip/${vehicle.tripId}'> ${vehicle.tripId}</a>`;
                } else {
                    popupText += `Trip: no trip configured`;
                }
                popup.setContent(popupText);
                vehicleLayer.bindPopup(popup);
                this.vehiclesLayer.addLayer(vehicleLayer);
            } else {
                console.log('Vehicle with bad coordinates: ' + vehicle.id);
            }
        });
        this.clusterGroup.removeLayer(this.vehiclesLayer);
        // Timeout due to timing bug on the initalization for an unknown reason.
        if (fitToBounds) {
            this.invalidateMap();
            console.log('Fitting bounds to markerLayers...');
            this.map.fitBounds(this.vehiclesLayer.getBounds());
        }
    }

    onMapReady(map: Map) {
        this.map = map;
        this.invalidateMap();
    }

    invalidateMap(): void {
        this.map?.invalidateSize();
    }

    onResize(event: any) {
        this.invalidateMap();
    }

    ngOnDestroy() {
        if (this.intervalSubscription) {
            this.intervalSubscription.unsubscribe();
        }
    }
}
