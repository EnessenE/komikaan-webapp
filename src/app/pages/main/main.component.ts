import { Component, OnInit, TemplateRef, inject } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { JourneyResult, TravelAdvice } from '../../models/journey-result';
import { DatePipe } from '@angular/common';
import { ErrorComponent } from '../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { DisruptionComponent } from '../../comps/disruption/disruption.component';
import { TravelAdviceComponent } from '../../comps/travel-advice/travel-advice.component';
import { StopComponent } from '../../comps/stop/stop.component';
import { SimplifiedStop } from '../../models/simplified-stop';

@Component({
    selector: 'app-main',
    standalone: true,
    imports: [
        DatePipe,
        ErrorComponent,
        NgbTooltipModule,
        DisruptionComponent,
        TravelAdviceComponent,
        NgbAccordionModule,
        StopComponent
    ],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
    foundStopsDestination: SimplifiedStop[] | undefined;
    foundStopsOrigin: SimplifiedStop[] | undefined;
    originStop: string = 'Amsterdam Centraal';
    destinationStop: string = 'Eindhoven Centraal';
    possibility: JourneyResult | undefined;
    loadingPossibility: boolean = false;
    searchFailed = false;
    error: HttpErrorResponse | undefined;
    pinnedData: TravelAdvice[] = [];

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.originStop = localStorage.getItem('originStop') as string;
        this.destinationStop = localStorage.getItem('destinationStop') as string;
        if (this.originStop && this.destinationStop) {
            this.checkPossibility();
        }
        this.checkForPins();
    }

    checkForPins(): void {
        var pinnedDataRaw = localStorage.getItem('pinned') as string;
        if (pinnedDataRaw) {
            this.pinnedData = JSON.parse(pinnedDataRaw);

            console.log('Pinned data detected');
            this.processPinnedData();
        } else {
            console.log('No pinned data');
        }
    }

    processPinnedData(): void {
        this.pinnedData.forEach((advice) => {
            advice.oldData = true;
        });
    }

    verifyAgainstPins(): void {
        this.possibility?.travelAdvice.forEach((advice) => {
            //Work around for lazy equality checks
            const adviceCopy = structuredClone(advice);
            adviceCopy.pinned = true;
            adviceCopy.oldData = true;

            var existingPinnedAdvice = this.pinnedData.find(
                (pinnedAdvice) => JSON.stringify(pinnedAdvice) === JSON.stringify(adviceCopy),
            );

            if (existingPinnedAdvice) {
                console.log('Found an old pin in new data!');
                existingPinnedAdvice.oldData = false;
                advice.pinned = true;
            }
        });
    }

    switchAround() {
        var tempOrigin = this.originStop;
        this.originStop = this.destinationStop;
        this.destinationStop = tempOrigin;
        if (this.originStop && this.destinationStop) {
            this.checkPossibility();
        }
    }

    async onSearchInputChange(event: any) {
        var searchText = event.target.value;
        console.log('Searching for ' + searchText);
        this.apiService.GetStops(event.target.value).subscribe({
            next: (data) => (this.foundStopsDestination = data),
        });
    }

    async onSearchInputChangeOrigin(event: any) {
        var searchText = event.target.value;
        console.log('Searching for ' + searchText);
        this.apiService.GetStops(event.target.value).subscribe({
            next: (data) => (this.foundStopsOrigin = data),
        });
    }

    selectStopOrigin(value: SimplifiedStop) {
        this.originStop = value.name;
        this.foundStopsOrigin = undefined;
        this.checkPossibility();
    }

    selectStopDestination(value: SimplifiedStop) {
        this.destinationStop = value.name;
        this.foundStopsDestination = undefined;
        this.checkPossibility();
    }

    checkPossibility() {
        this.checkForPins();
        console.log(this.originStop + ' > ' + this.destinationStop);
        if (this.originStop != null) {
            localStorage.setItem('originStop', this.originStop);
        }
        if (this.destinationStop != null) {
            localStorage.setItem('destinationStop', this.destinationStop);
        }
        if (this.originStop !== null && this.destinationStop !== null) {
            this.loadingPossibility = true;
            this.possibility = undefined;
            this.error = undefined;
            this.apiService.GetPossibility(this.originStop, this.destinationStop).subscribe({
                next: (data) => this.setPossibility(data),
                error: (error) => this.handleError(error),
            });
        }
    }

    setPossibility(journeyResult: JourneyResult) {
        this.loadingPossibility = false;
        this.possibility = journeyResult;
        this.possibility.travelAdvice.forEach((travelAdvice) => {
            var impossibility = travelAdvice.route.find(
                (item) => item.realisticTransfer === false && item.cancelled == false,
            );
            if (impossibility !== undefined) {
                travelAdvice.realistic = false;
            } else {
                travelAdvice.realistic = true;
            }
        });
        this.verifyAgainstPins();
    }

    handleError(error: HttpErrorResponse) {
        this.error = error;
        console.error(error);
    }

    clearPins() {
        console.log('Pins cleared!');
        localStorage.removeItem('pinned');
        this.pinnedData = [];
    }
}
