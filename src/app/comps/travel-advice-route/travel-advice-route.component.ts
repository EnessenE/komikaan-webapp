import { Component, Input } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule, NgbAccordionModule } from '@ng-bootstrap/ng-bootstrap';
import { TrackSelectionComponent } from '../track-selection/track-selection.component';
import { TimeSelectionComponent } from '../time-selection/time-selection.component';

@Component({
    selector: 'app-travel-advice-route',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule, NgbAccordionModule, TrackSelectionComponent, TimeSelectionComponent],
    templateUrl: './travel-advice-route.component.html',
    styleUrl: './travel-advice-route.component.scss',
})
export class TravelAdviceRouteComponent {
    @Input()
    travelAdvice!: TravelAdvice;
}
