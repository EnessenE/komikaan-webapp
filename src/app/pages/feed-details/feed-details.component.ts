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
    routes: GTFSRoute[] | undefined;
    stops: GTFSSearchStop[] | undefined;
    vehiclePositions: VehiclePosition[] | undefined;
    onlyRealTime: boolean = false;

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
        var realtimeData = this.route.snapshot.queryParamMap.get('realtime');
        if (realtimeData != null) {
            // lmao what
            this.onlyRealTime = Boolean(JSON.parse(realtimeData));
            if (this.onlyRealTime) {
                this.clusterGroup = new MarkerClusterGroup({
                    spiderfyOnMaxZoom: false,
                    showCoverageOnHover: true,
                    zoomToBoundsOnClick: true,
                    disableClusteringAtZoom: 5,
                    removeOutsideVisibleBounds: true,
                    animate: true,
                    chunkedLoading: true,
                });
            } else {
                this.clusterGroup = new MarkerClusterGroup({
                    spiderfyOnMaxZoom: false,
                    showCoverageOnHover: true,
                    zoomToBoundsOnClick: true,
                    disableClusteringAtZoom: 13,
                    removeOutsideVisibleBounds: true,
                    animate: true,
                    chunkedLoading: true,
                });
            }
        }
        console.log('Realtime only: ' + this.onlyRealTime);
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
    }

    ngOnInit(): void {
        this.loading = true;

        this.markerLayers?.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });

        this.layers.push(this.clusterGroup);

        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle(this.selectedFeed);
            this.titleService.setTitle('Feed ' + this.selectedFeed);

            this.getFeedPositions();
            this.intervalSubscription = interval(10000).subscribe(() => {
                this.getFeedPositions();
            });

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
            }
        });
    }

    private getFeedPositions() {
        this.apiService.GetFeedPositions(this.selectedFeed).subscribe({
            next: (data) => {
                this.markerLayers = featureGroup();
                this.vehiclePositions = data;
                this.addVehiclesToMap(data);
                this.loading = false;
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
        this.layers.push(this.markerLayers);
        // Timeout due to timing bug on the initalization for an unknown reason.
        setTimeout(() => {
            console.log('Fitting bounds to markerLayers...');
            this.map.fitBounds(this.clusterGroup.getBounds());
        }, 100);
        console.log('bounds');
        this.invalidateMap();
    }

    addVehiclesToMap(vehicles: VehiclePosition[]) {
        vehicles.forEach((vehicle) => {
            var stopLayer = circle([vehicle.latitude, vehicle.longitude], { radius: 40, color: 'green' });

            var popup = new Popup();
            var popupText = `Known as: ${vehicle.id} </br> Measured at: ${vehicle.measurementTime} </br>`;
            if (vehicle.tripId != undefined) {
                popupText += `Trip: <a href='/trip/${vehicle.tripId}'> ${vehicle.tripId}</a>`;
            } else {
                popupText += `Trip: no trip configured`;
            }
            popup.setContent(popupText);
            stopLayer.bindPopup(popup);
            this.clusterGroup.addLayer(stopLayer);
        });
        // Timeout due to timing bug on the initalization for an unknown reason.
        setTimeout(() => {
            console.log('Fitting bounds to markerLayers...');
            this.map.fitBounds(this.clusterGroup.getBounds());
        }, 100);
        console.log('bounds');
        this.invalidateMap();
    }

    onMapReady(map: Map) {
        this.map = map;
        this.markerLayers = featureGroup();
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
