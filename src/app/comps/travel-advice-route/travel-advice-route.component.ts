import { Component, Input } from '@angular/core';
import { RoutePart, TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TrackSelectionComponent } from '../track-selection/track-selection.component';

@Component({
    selector: 'app-travel-advice-route',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule, NgbAccordionModule, TrackSelectionComponent],
    templateUrl: './travel-advice-route.component.html',
    styleUrl: './travel-advice-route.component.scss',
})
export class TravelAdviceRouteComponent {
    @Input()
    travelAdvice!: TravelAdvice;
}
