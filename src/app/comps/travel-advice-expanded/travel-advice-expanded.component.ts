import { AfterContentInit, Component, Input, OnInit } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TrackSelectionComponent } from '../track-selection/track-selection.component';
import { TimeSelectionComponent } from '../time-selection/time-selection.component';
import { LeafletControlLayersConfig, LeafletModule } from '@asymmetrik/ngx-leaflet';
import { LatLng, Layer, circle, latLng, polyline, tileLayer } from 'leaflet';

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

    get options() {
        return {
            zoom: 10,
            center: latLng(52.0907, 5.1214),
        };
    }

    layers: Layer[] = [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 18,
            attribution: '...',
        }),
    ];

    ngOnInit(): void {
        this.travelAdvice.route.forEach((routePart, index) => {
            var routeLine: LatLng[] = [];
            routePart.stops.forEach((stop) => {
                var stopMark = circle([stop.latitude, stop.longitude], { radius: 100 });
                this.layers.push(stopMark);

                routeLine.push(latLng(stop.latitude, stop.longitude));
            });
            this.layersControl.overlays;
            this.layersControl.overlays[routePart.lineName ?? routePart.direction ?? 'Part ' + index] = polyline(
                routeLine,
                { color: 'red' },
            );
        });
    }
}
