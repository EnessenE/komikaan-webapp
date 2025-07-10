import { Component, OnInit } from '@angular/core';
import { GTFSAgency } from '../../models/gtfsagency';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { DatePipe } from '@angular/common';

@Component({
    selector: 'app-agencies',
    imports: [DatePipe, RouterModule],
    templateUrl: './agencies.component.html',
    styleUrl: './agencies.component.scss',
})
export class AgenciesComponent implements OnInit {
    loading: boolean = false;
    selectedFeed: string = 'Unknown';
    agencies: GTFSAgency[] | undefined;

    displayedColumns: string[] = ['name', 'url', 'timezone', 'phone', 'lastUpdated'];

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle('Agencies - ' + this.selectedFeed);

            this.apiService.GetAgencies(this.selectedFeed).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.agencies = data;
                },
            });
        });

        this.loading = true;
    }
}
