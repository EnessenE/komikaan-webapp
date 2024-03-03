import { Component, Input, input } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-travel-advice',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule],
    templateUrl: './travel-advice.component.html',
    styleUrl: './travel-advice.component.scss',
})
export class TravelAdviceComponent {
    @Input()
    travelAdvice!: TravelAdvice;
}
