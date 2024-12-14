import { Component, Input, OnInit, ViewChild, input } from '@angular/core';
import { TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TravelAdviceRouteComponent } from '../travel-advice-route/travel-advice-route.component';
import { TravelAdviceExpandedComponent } from '../travel-advice-expanded/travel-advice-expanded.component';

@Component({
    selector: 'app-travel-advice',
    imports: [
        DatePipe,
        NgbTooltipModule,
        NgbAccordionModule,
        TravelAdviceRouteComponent,
        TravelAdviceExpandedComponent,
    ],
    templateUrl: './travel-advice.component.html',
    styleUrl: './travel-advice.component.scss'
})
export class TravelAdviceComponent implements OnInit{
    @Input()
    travelAdvice!: TravelAdvice;
    @Input()
    index!: number;
    @Input()
    travelAdviceDisplayType!: string;

    @ViewChild(TravelAdviceExpandedComponent) child!: TravelAdviceExpandedComponent;

    ngOnInit(): void {
    }

    togglePin(travelAdvice: TravelAdvice) {
        var pinnedDataRaw = localStorage.getItem('pinned') as string;
        var wasItPinned = travelAdvice.pinned;
        var currentPins: TravelAdvice[] = [];
        if (pinnedDataRaw) { 
            currentPins = JSON.parse(pinnedDataRaw);
        }
        if (wasItPinned) {
            console.log('unpinning');
            const adviceCopy = structuredClone(travelAdvice);
            adviceCopy.oldData = false;
            adviceCopy.pinned = true;
            //TODO: not use this.
            currentPins.forEach(element => {
                console.log(element.pinned + ' - '+ element.oldData)
                element.oldData = false;
            });
            var currentIndex = currentPins.findIndex(
                (pinnedAdvice) => JSON.stringify(pinnedAdvice) === JSON.stringify(adviceCopy),
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

    expand(travelAdvice: TravelAdvice){
        this.child.InvalidateMap();
    }
}
