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
import { GTFSStopTime } from '../../models/gtfsstop-time';
import { RouterLink } from '@angular/router';

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
        StopComponent,
        RouterLink
    ],
    templateUrl: './main.component.html',
    styleUrl: './main.component.scss',
})
export class MainComponent implements OnInit {
    foundStopsOrigin: SimplifiedStop[] | undefined;
    originStop: SimplifiedStop | undefined;
    loadingPossibility: boolean = false;
    error: HttpErrorResponse | undefined;

    constructor(private apiService: ApiService) {}

    ngOnInit(): void {
        this.originStop = JSON.parse(localStorage.getItem('originStop') as string);
    }



    async onSearchInputChangeOrigin(event: any) {
        var searchText = event.target.value;
        console.log('Searching for ' + searchText);
        this.apiService.GetStops(event.target.value).subscribe({
            next: (data) => (this.foundStopsOrigin = data),
            error: (error) => (this.error = error)
        });
    }

    selectStopOrigin(value: SimplifiedStop) {
        this.originStop = value;
        this.foundStopsOrigin = undefined;

        console.log(this.originStop);
    }

    handleError(error: HttpErrorResponse) {
        this.error = error;
        console.error(error);
    }
}
