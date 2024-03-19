import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TrackSelectionComponent } from '../track-selection/track-selection.component';
import { TimeSelectionComponent } from '../time-selection/time-selection.component';
import { LeafletControlLayersConfig, LeafletModule } from '@asymmetrik/ngx-leaflet';
import {
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
export class TravelAdviceExpandedComponent implements OnInit {
    @Input()
    travelAdvice!: TravelAdvice;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    mapFitToBounds!: LatLngBounds;

    get options() {
        return {
            zoom: 10,
            center: latLng(52.0907, 5.1214),
        };
    }

    layers: Layer[] = [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
        }),
    ];

    ngOnInit(): void {
        console.log("init")
    }

    onMapReady(map: Map) {
        var markerLayers = featureGroup();
        this.travelAdvice.route.forEach((routePart, index) => {
            var routeLine: LatLng[] = [];
            routePart.stops.forEach((stop) => {
                var stopMark = marker([stop.latitude, stop.longitude], {
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

                stopMark.bindPopup(popup);
                markerLayers.addLayer(stopMark);

                routeLine.push(latLng(stop.latitude, stop.longitude));
            });
            var line = polyline(routeLine, { color: 'red' });
            this.layersControl.overlays[routePart.lineName ?? routePart.direction ?? 'Part ' + index] = line;
            this.layers.push(line);
        });

        this.layers.push(markerLayers);
        map.fitBounds(markerLayers.getBounds());
    }
}
