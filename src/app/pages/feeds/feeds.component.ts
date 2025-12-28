import { AfterViewInit, Component, inject, OnInit, ViewChild } from '@angular/core';
import { BrowserModule, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Feed } from '../../models/feed';
import { DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator } from '@angular/material/paginator';
import { LoadingComponent } from "../../comps/loading/loading.component";

@Component({
    selector: 'app-feeds',
    imports: [RouterLink, DatePipe, MatTableModule, MatSortModule, LoadingComponent],
    templateUrl: './feeds.component.html',
    styleUrl: './feeds.component.scss',
})
export class FeedsComponent implements OnInit, AfterViewInit {
    feeds: Feed[] | undefined;
    loading: boolean = false;
    error: any;
    dataSource: MatTableDataSource<Feed, MatPaginator> = new MatTableDataSource();
    displayedColumns: string[] = [
        'name',
        'credits',
        'realTime',
        'downloadPending',
        'interval',
        'lastChecked',
        'state',
        'lastImportStart',
        'lastImportSuccess',
        'lastImportFailure',
        'lastCheckFailure',
        'agencies',
        'routes',
        'stops',
        'alerts',
        'vehicles',
        'trips'
    ];

    @ViewChild(MatSort) sort!: MatSort;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {
        this.titleService.setTitle('All feeds');
    }

    ngAfterViewInit() {}

    ngOnInit(): void {
        this.loading = true;
        this.apiService.GetFeeds().subscribe({
            next: (data) => {
                this.loading = false;
                this.feeds = data;
                this.dataSource = new MatTableDataSource(this.feeds);
                this.dataSource.sort = this.sort!;
            },
            error: (error) => (this.error = error),
        });
    }
}
