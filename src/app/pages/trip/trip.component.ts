import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSTrip } from '../../models/gtfstrip';
import { LeafletControlLayersConfig, LeafletModule } from '@asymmetrik/ngx-leaflet';
import {
    FeatureGroup,
    Icon,
    LatLng,
    LatLngBounds,
    Layer,
    Map,
    Popup,
    featureGroup,
    icon,
    latLng,
    marker,
    polyline,
    tileLayer,
} from 'leaflet';

@Component({
    selector: 'app-trip',
    standalone: true,
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink, LeafletModule],
    templateUrl: './trip.component.html',
    styleUrl: './trip.component.scss',
})
export class TripComponent {
    trip: GTFSTrip | undefined;
    selectedTrip: string | undefined;
    loading: boolean = false;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.trip = undefined;
            this.selectedTrip = params['id'];
            this.apiService.GetTrip(params['id']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.trip = data;
                    this.dataRetrieved();
                },
            });
        });
    }

    map!: Map;
    markerLayers!: FeatureGroup;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    mapFitToBounds!: LatLngBounds;

    options = {
        zoom: 10,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
        }),
    ];

    dataRetrieved() {
        var routeLine: LatLng[] = [];
        this.trip!.stops?.forEach((stop) => {
            var stopLayer = marker([stop.latitude, stop.longitude], {
                // Workaround https://github.com/bluehalo/ngx-leaflet?tab=readme-ov-file#angular-cli-marker-workaround
                icon: icon({
                    ...Icon.Default.prototype.options,
                    iconUrl: 'assets/marker-icon.png',
                    iconRetinaUrl: 'assets/marker-icon-2x.png',
                    shadowUrl: 'assets/marker-shadow.png',
                }),
            });

            var popup = new Popup();
            popup.setContent('<a routerLink="/stops/' + stop.id + '">' + stop.name + '</a>');

            stopLayer.bindPopup(popup);
            this.markerLayers.addLayer(stopLayer);

            if (!(this.trip?.shapes && this.trip?.shapes.length > 0)) {
                routeLine.push(latLng(stop.latitude, stop.longitude));
            }
        });
        this.trip!.shapes?.forEach((shape) => {
            routeLine.push(latLng(shape.latitude, shape.longitude));
        });

        var lineColor = 'green';

        var line = polyline(routeLine, { color: lineColor });
        this.layersControl.overlays[stop.name] = line;
        this.layers.push(line);

        this.layers.push(this.markerLayers);
        this.InvalidateMap();
    }

    onMapReady(map: Map) {
        this.map = map;
        this.markerLayers = featureGroup();
    }

    InvalidateMap(): void {
        this.map?.invalidateSize();
        this.map?.fitBounds(this.markerLayers.getBounds());
    }
}
