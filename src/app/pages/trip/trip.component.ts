import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { GTFSStopTime } from '../../models/gtfsstop-time';
import { ApiService } from '../../services/api.service';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSTrip } from '../../models/gtfstrip';

@Component({
    selector: 'app-trip',
    standalone: true,
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink],
    templateUrl: './trip.component.html',
    styleUrl: './trip.component.scss',
})
export class TripComponent {
    tripStops: GTFSTrip[] | undefined;
    selectedTrip: string | undefined;
    loading: boolean = false;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.tripStops = undefined;
            this.selectedTrip = params['id'];
            this.apiService.GetTrip(params['id']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.tripStops = data
                },
            });
        });
    }
}
