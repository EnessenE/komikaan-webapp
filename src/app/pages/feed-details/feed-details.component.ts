import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { GTFSRoute } from '../../models/gtfsroute';
import { RouteComponent } from '../../comps/route/route.component';
import { FeatureGroup, Map, LatLngBounds, latLng, Layer, tileLayer, featureGroup, circle, Popup, MarkerClusterGroupOptions, MarkerClusterGroup } from 'leaflet';
import { GTFSSearchStop } from '../../models/gtfssearchstop';
import { VehiclePosition } from '../../models/vehicle-position';
import { LeafletMarkerClusterModule } from '@bluehalo/ngx-leaflet-markercluster';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

@Component({
    selector: 'app-feed-details',
    standalone: true,
    imports: [RouterLink, LeafletModule, LeafletMarkerClusterModule, RouteComponent],
    templateUrl: './feed-details.component.html',
    styleUrl: './feed-details.component.scss',
})
export class FeedDetailsComponent implements OnInit {
    loading: boolean = false;
    selectedFeed: string = 'Unknown';
    routes: GTFSRoute[] | undefined;
    stops: GTFSSearchStop[] | undefined;
    vehiclePositions: VehiclePosition[] | undefined;

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
      disableClusteringAtZoom: 15,
      removeOutsideVisibleBounds: true,
      animate: true,
      chunkedLoading: true,
    });;

    options = {
        zoom: 13,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        }),
    ];

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.loading = true;

        this.layers = [
            tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            }),
        ];
        this.markerLayers?.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });

        this.layers.push(this.clusterGroup)

        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle(this.selectedFeed);
            this.titleService.setTitle('Feed ' + this.selectedFeed);
            this.apiService.GetFeedRoutes(this.selectedFeed).subscribe({
                next: (data) => {
                    this.routes = data;
                    this.loading = false;
                },
            });
            this.apiService.GetFeedPositions(this.selectedFeed).subscribe({
                next: (data) => {
                    this.vehiclePositions = data;
                    this.addVehiclesToMap(data);
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
        });
    }

    addStopsToMap(stops: GTFSSearchStop[]) {
        stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 100 });

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
                var stopLayer = circle([vehicle.latitude, vehicle.longitude], { radius: 100, color: "green" });

                var popup = new Popup();
                popup.setContent(vehicle.id);
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
}
