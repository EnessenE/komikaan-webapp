import { Component, OnInit, TemplateRef, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { JourneyResult, TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { ErrorComponent } from '../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DisruptionComponent } from '../../comps/disruption/disruption.component';
import { TravelAdviceComponent } from '../../comps/travel-advice/travel-advice.component';
import { StopComponent } from '../../comps/stop/stop.component';
import { GTFSStopTime } from '../../models/gtfsstop-time';
import { RouterLink } from '@angular/router';
import { PointTuple } from 'leaflet';
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
import { LeafletControlLayersConfig, LeafletModule } from '@asymmetrik/ngx-leaflet';
import { GTFSStop } from '../../models/gtfsstop';
import { debounceTime, Subject } from 'rxjs';

@Component({
    selector: 'app-main',
    standalone: true,
    imports: [
        DatePipe,
        ErrorComponent,
        NgbTooltipModule,
        DisruptionComponent,
        TravelAdviceComponent,
        NgbAccordionModule,
        StopComponent,
        RouterLink,
        LeafletModule,
    ],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
    foundStopsOrigin: GTFSStop[] | undefined;
    nearbyStops: GTFSStop[] | undefined;
    originStop: GTFSStop | undefined;
    loading: boolean = false;
    error: HttpErrorResponse | undefined;
    searchInputSubject: Subject<string> = new Subject();

    location: { lat: number; lng: number } | undefined;

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

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.searchInputSubject.pipe(
            debounceTime(300)  // Adjust the debounce time as needed (e.g., 300ms)
        ).subscribe(searchText => {
            this.loading = true;
            console.log('Searching for ' + searchText);
            this.apiService.GetStops(searchText).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.foundStopsOrigin = data;
                    this.addStopsToMap(data);
                },
                error: (error) => (this.error = error),
            });
        });

    }

    onSearchInputChangeOrigin(event: any) {
        var searchText = event.target.value;
        this.searchInputSubject.next(searchText);
    }

    selectStopOrigin(value: GTFSStop) {
        this.originStop = value;
        this.foundStopsOrigin = undefined;

        console.log(this.originStop);
    }

    handleError(error: HttpErrorResponse) {
        this.error = error;
        console.error(error);
    }

    getNearbyStops() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (position) {
                        console.log(
                            'Latitude: ' + position.coords.latitude + 'Longitude: ' + position.coords.longitude,
                        );
                        let lat = position.coords.latitude;
                        let lng = position.coords.longitude;

                        const location = {
                            lat,
                            lng,
                        };
                        console.log('Got a location: ' + location);

                        this.location = location;
                        this.apiService.NearbyStops(location).subscribe({
                            next: (data) => {
                                this.nearbyStops = data;
                                this.addStopsToMap(this.nearbyStops);
                            },
                            error: (error) => (this.error = error),
                        });
                    }
                },
                (error) => console.log(error),
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    addStopsToMap(stops: GTFSStop[]) {
        this.layers = [
            tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                maxZoom: 18,
            }),
        ];
        this.markerLayers.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });
        stops.forEach((stop) => {
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
            popup.setContent('<a [routerLink]="/stops/' + stop.id + '">' + stop.name + '</a>');

            stopLayer.bindPopup(popup);
            this.markerLayers.addLayer(stopLayer);
        });
        this.layers.push(this.markerLayers);
        this.map?.fitBounds(this.markerLayers.getBounds());
        this.invalidateMap();
    }

    onMapReady(map: Map) {
        this.map = map;
        this.markerLayers = featureGroup();
    }

    invalidateMap(): void {
        this.map?.invalidateSize();
    }
    onResize(event: any) {
        this.invalidateMap();
    }
}
