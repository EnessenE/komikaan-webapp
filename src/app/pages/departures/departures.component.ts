import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSStop } from '../../models/gtfsstop';
import { Title } from '@angular/platform-browser';

@Component({
    selector: 'app-departures',
    standalone: true,
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink],
    templateUrl: './departures.component.html',
    styleUrl: './departures.component.scss',
})
export class DeparturesComponent implements OnInit {
    stop: GTFSStop | undefined;
    selectedStop: string | undefined;
    loading: boolean = false;
    error: string | undefined;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.loading = true;
            this.stop = undefined;
            this.selectedStop = params['id'];
            this.apiService.GetStop(params['id'], params['type']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.stop = data;
                    this.titleService.setTitle(this.stop.name);
                },
                error: (error) =>{
                    this.loading = false;
                    this.error = error.message;
                }
            });
        });
    }
}
