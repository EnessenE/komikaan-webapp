import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GTFSStopTime } from '../../models/gtfsstop-time';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';

@Component({
    selector: 'app-departures',
    standalone: true,
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink],
    templateUrl: './departures.component.html',
    styleUrl: './departures.component.scss',
})
export class DeparturesComponent implements OnInit {
    stopTimes: GTFSStopTime[] | undefined;
    selectedStop: string | undefined;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        var routeSub = this.route.params.subscribe((params) => {
            this.selectedStop = params['id'];
            this.apiService.GetStopDepartures(params['id']).subscribe({
                next: (data) => (this.stopTimes = data),
            });
        });
    }
}
