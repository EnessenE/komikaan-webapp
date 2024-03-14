import { Component, Input, input } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TravelAdviceRouteComponent } from '../travel-advice-route/travel-advice-route.component';
import { TravelAdviceExpandedComponent } from '../travel-advice-expanded/travel-advice-expanded.component';
import { IconsModule } from '../../icons/icons.module';

@Component({
    selector: 'app-travel-advice',
    standalone: true,
    imports: [DatePipe, NgbTooltipModule, NgbAccordionModule, TravelAdviceRouteComponent, TravelAdviceExpandedComponent, IconsModule],
    templateUrl: './travel-advice.component.html',
    styleUrl: './travel-advice.component.scss',
})
export class TravelAdviceComponent {
    @Input()
    travelAdvice!: TravelAdvice;
    @Input()
    index!: number;
}
