import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TrackSelectionComponent } from '../track-selection/track-selection.component';
import { TimeSelectionComponent } from '../time-selection/time-selection.component';
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
    selector: 'app-travel-advice-expanded',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule, TrackSelectionComponent, TimeSelectionComponent, LeafletModule],
    templateUrl: './travel-advice-expanded.component.html',
    styleUrl: './travel-advice-expanded.component.scss',
})
export class TravelAdviceExpandedComponent {
    @Input()
    travelAdvice!: TravelAdvice;

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
        }),
    ];

    onMapReady(map: Map) {
        this.map = map;
        this.markerLayers = featureGroup();
        this.travelAdvice.route.forEach((routePart, index) => {
            var routeLine: LatLng[] = [];
            routePart.stops.forEach((stop) => {
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
                popup.setContent(stop.name);

                stopLayer.bindPopup(popup);
                this.markerLayers.addLayer(stopLayer);

                routeLine.push(latLng(stop.latitude, stop.longitude));
            });
            var lineColor = 'green';
            if (routePart.cancelled) {
                lineColor = 'red';
            }
            var line = polyline(routeLine, { color: lineColor });
            this.layersControl.overlays[routePart.lineName ?? routePart.direction ?? 'Part ' + index] = line;
            this.layers.push(line);
        });

        this.layers.push(this.markerLayers);
    }

    InvalidateMap(): void {
        this.map?.invalidateSize();
        this.map?.fitBounds(this.markerLayers.getBounds());
    }
}
