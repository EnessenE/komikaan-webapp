import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSStop } from '../../models/gtfsstop';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { ErrorComponent } from '../../comps/error/error.component';
import { HttpErrorResponse } from '@angular/common/http';
import { RouteComponent } from '../../comps/route/route.component';

@Component({
    selector: 'app-departures',
    standalone: true,
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink, DatePipe, ErrorComponent, RouteComponent],
    templateUrl: './departures.component.html',
    styleUrl: './departures.component.scss',
})
export class DeparturesComponent implements OnInit {
    stop: GTFSStop | undefined;
    selectedStop: string | undefined;
    loading: boolean = false;
    error: HttpErrorResponse | undefined;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    convertToDate(dateString: string): Date {
        return new Date(dateString);
    }

    ngOnInit(): void {
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.loading = true;
            this.stop = undefined;
            this.selectedStop = params['id'];
            this.apiService.GetStop(params['id'], params['type']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.stop = data as GTFSStop;
                    this.titleService.setTitle(this.stop.name);
                },
                error: (error) => {
                    this.loading = false;
                    this.error = error;
                },
            });
        });
    }
}
