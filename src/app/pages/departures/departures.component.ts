import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSStop } from '../../models/gtfsstop';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { ErrorComponent } from '../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { RouteComponent } from '../../comps/route/route.component';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { LeafletControlLayersConfig, LeafletModule } from '@bluehalo/ngx-leaflet';
import {
    FeatureGroup,
    Icon,
    LatLngBounds,
    Layer,
    Map,
    Popup,
    circle,
    featureGroup,
    icon,
    latLng,
    marker,
    tileLayer,
} from 'leaflet';
import { GTFSSearchStop } from '../../models/gtfssearchstop';

@Component({
    selector: 'app-departures',
    imports: [
        TimeOnlySelectionComponent,
        TrackSelectionComponent,
        RouterLink,
        ErrorComponent,
        RouteComponent,
        LoadingComponent,
        LeafletModule,
    ],
    templateUrl: './departures.component.html',
    styleUrl: './departures.component.scss',
})
export class DeparturesComponent implements OnInit {
    stop: GTFSStop | undefined;
    selectedStop: string | undefined;
    loading: boolean = false;
    error: HttpErrorResponse | undefined;

    map!: Map;
    markerLayers!: FeatureGroup;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    mapFitToBounds!: LatLngBounds;

    options = {
        zoom: 13,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    convertToDate(dateString: string): Date {
        return new Date(dateString);
    }

    ngOnInit(): void {
        this.markerLayers = featureGroup();
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.loading = true;
            this.stop = undefined;
            this.selectedStop = params['id'];
            this.apiService.GetStop(params['id'], params['type']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.stop = data as GTFSStop;
                    this.titleService.setTitle(this.stop.name);
                    this.addStopsToMap(this.stop.mergedStops);
                },
                error: (error) => {
                    this.loading = false;
                    this.error = error;
                },
            });
        });
    }

    addStopsToMap(stops: GTFSStop[]) {
        console.log("Adding stops")
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')];
        this.markerLayers.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });
        stops.forEach((stop) => {
            if (stop.latitude && stop.longitude){
            var stopLayer = circle([stop.latitude, stop.longitude], { radius: 100 });

            var popup = new Popup();
            popup.setContent(stop.name);

            stopLayer.bindPopup(popup);
            this.markerLayers.addLayer(stopLayer);
            }
            else{
                console.log("No valid stop coordinates for: " + stop.name)
            }
        });
        this.layers.push(this.markerLayers);

        setTimeout(() => {
            console.log('Fitting bounds to markerLayers...');
            this.markerLayers.eachLayer((aa) => {
                console.log(aa)
            });
            this.map.fitBounds(this.markerLayers.getBounds());
        }, 100);
        this.invalidateMap();
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
}
