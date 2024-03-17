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
    imports: [
        DatePipe,
        NgbTooltipModule,
        NgbAccordionModule,
        TravelAdviceRouteComponent,
        TravelAdviceExpandedComponent,
        IconsModule,
    ],
    templateUrl: './travel-advice.component.html',
    styleUrl: './travel-advice.component.scss',
})
export class TravelAdviceComponent {
    @Input()
    travelAdvice!: TravelAdvice;
    @Input()
    index!: number;
    @Input()
    travelAdviceDisplayType!: string;

    togglePin(travelAdvice: TravelAdvice) {
        var pinnedDataRaw = localStorage.getItem('pinned') as string;
        var wasItPinned = travelAdvice.pinned;
        var currentPins: TravelAdvice[] = [];
        if (pinnedDataRaw) {
            currentPins = JSON.parse(pinnedDataRaw);
        }
        if (wasItPinned) {
            console.log('unpinning');
            //TODO: not use this.
            var currentIndex = currentPins.findIndex(
                (pinnedAdvice) => JSON.stringify(pinnedAdvice) === JSON.stringify(travelAdvice),
            );
            console.log(currentIndex);
            if (currentIndex >= 0) {
                currentPins.splice(currentIndex, 1);
            } else {
                console.error('Item was pinned but not found in the pin data');
            }
            travelAdvice.pinned = false;
        } else {
            console.log('pinning');
            travelAdvice.pinned = true;
            currentPins.push(travelAdvice);
        }
        localStorage.setItem('pinned', JSON.stringify(currentPins));
    }
}
