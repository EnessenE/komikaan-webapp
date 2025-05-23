import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { DatePipe } from '@angular/common';
import { ErrorComponent } from '../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DisruptionComponent } from '../../comps/disruption/disruption.component';
import { TravelAdviceComponent } from '../../comps/travel-advice/travel-advice.component';
import { StopComponent } from '../../comps/stop/stop.component';
import { RouterLink } from '@angular/router';
import { circle } from 'leaflet';
import {
    FeatureGroup,
    Icon,
    LatLngBounds,
    Layer,
    Map,
    Popup,
    featureGroup,
    icon,
    latLng,
    marker,
    tileLayer,
} from 'leaflet';
import { GTFSStop } from '../../models/gtfsstop';
import { debounceTime, Subject } from 'rxjs';
import { GTFSSearchStop } from '../../models/gtfssearchstop';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';
import { NearbyData } from '../../models/nearby-data';

@Component({
    selector: 'app-main',
    imports: [ErrorComponent, NgbTooltipModule, NgbAccordionModule, StopComponent, RouterLink, LeafletModule],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
    originStop: GTFSStop | undefined;
    foundStopsOrigin: GTFSSearchStop[] | undefined;
    loading: boolean = false;
    error: any | undefined;
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
        zoom: 13,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.markerLayers = featureGroup();
        this.searchInputSubject
            .pipe(
                debounceTime(600), // Adjust the debounce time as needed (e.g., 300ms)
            )
            .subscribe((searchText) => {
                this.loading = true;
                this.foundStopsOrigin = [];
                console.log('Searching for ' + searchText);
                this.apiService.GetStops(searchText).subscribe({
                    next: (data) => {
                        this.loading = false;
                        this.foundStopsOrigin = data;
                        this.addStopsToMap(data);
                    },
                    error: (error) => {
                        console.error(error);
                        this.error = error;
                    },
                });
            });

        setTimeout(() => {
            this.invalidateMap();
        }, 100);
    }

    onSearchInputChangeOrigin(event: any) {
        var searchText = event.target.value;
        this.searchInputSubject.next(searchText);
    }

    handleError(error: HttpErrorResponse) {
        this.error = error;
        console.error(error);
    }

    selectStopOrigin(value: GTFSStop) {
        this.originStop = value;
        this.foundStopsOrigin = undefined;

        console.log(this.originStop);
    }

    getNearbyStops() {
        if (navigator.geolocation) {
            this.loading = true;
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
                                try {
                                    this.foundStopsOrigin = data.stops;
                                    this.addToMap(data);
                                    this.loading = false;
                                } catch (error) {
                                    console.error(error);
                                    this.error = error;
                                }
                            },
                            error: (error) => {
                                this.error = error;
                                this.loading = false;
                            },
                        });
                    }
                },
                (error) => console.log(error),
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
    }

    addStopsToMap(stops: GTFSSearchStop[]) {
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
        this.markerLayers.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });
        stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 100 });

                var popup = new Popup();
                popup.setContent('<a href="/stops/' + stop.id + '/' + stop.stopType + '">' + stop.name + '</a>');

                stopLayer.bindPopup(popup);
                this.markerLayers.addLayer(stopLayer);
            });
        });
        this.layers.push(this.markerLayers);
        this.addDefaultMarkers();
        // Timeout due to timing bug on the initalization for an unknown reason.
        setTimeout(() => {
            console.log('Fitting bounds to markerLayers...');
            this.map.fitBounds(this.markerLayers.getBounds());
        }, 100);
        this.invalidateMap();
    }

    addToMap(nearbyData: NearbyData) {
        this.layers = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];
        this.markerLayers.eachLayer((layer) => {
            this.markerLayers.removeLayer(layer);
        });
        nearbyData.stops.forEach((stop) => {
            stop.adjustedCoordinates.forEach((coordinate) => {
                var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 100 });

                var popup = new Popup();
                popup.setContent('<a href="/stops/' + stop.id + '/' + stop.stopType + '">' + stop.name + '</a>');

                stopLayer.bindPopup(popup);
                this.markerLayers.addLayer(stopLayer);
            });
        });
        nearbyData.vehicles.forEach((vehicle) => {
            var stopLayer = circle([vehicle.latitude, vehicle.longitude], { radius: 50, color: "green" });

            var popup = new Popup();
            var popupText = `Known as: ${vehicle.id} </br> Measured at: ${vehicle.measurementTime} </br>`;
            if (vehicle.tripId != undefined) {
                popupText += `Trip: <a href='/trip/${vehicle.tripId}'> ${vehicle.tripId}</a>`;
            } else {
                popupText += `Trip: no trip configured`;
            }
            popup.setContent(popupText);
            stopLayer.bindPopup(popup);
            this.markerLayers.addLayer(stopLayer);
        });

        this.layers.push(this.markerLayers);
        this.addDefaultMarkers();
        // Timeout due to timing bug on the initalization for an unknown reason.
        setTimeout(() => {
            console.log('Fitting bounds to markerLayers...');
            this.map.fitBounds(this.markerLayers.getBounds());
        }, 100);
        this.invalidateMap();
    }

    addDefaultMarkers() {
        if (this.location) {
            var currentLocationLayer = marker([this.location.lat, this.location.lng], {
                // Workaround https://github.com/bluehalo/ngx-leaflet?tab=readme-ov-file#angular-cli-marker-workaround
                icon: icon({
                    ...Icon.Default.prototype.options,
                    iconUrl: 'assets/marker-icon.png',
                    iconRetinaUrl: 'assets/marker-icon-2x.png',
                    shadowUrl: 'assets/marker-shadow.png',
                }),
            });

            var popup = new Popup();
            currentLocationLayer.bindPopup(popup);
            popup.setContent('My current location');
            this.markerLayers.addLayer(currentLocationLayer);
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
}
