import { ChangeDetectionStrategy, AfterViewInit, Component, inject, OnInit, ViewChild  } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Feed } from '../../models/feed';
import { DatePipe } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatSort, MatSortModule, Sort } from '@angular/material/sort';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { LoadingComponent } from "../../comps/loading/loading.component";
import { StripHtmlPipe } from "../../pipes/strip-html.pipe";

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-feeds',
    imports: [RouterLink, DatePipe, MatTableModule, MatSortModule, MatPaginatorModule, LoadingComponent, StripHtmlPipe],
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
    @ViewChild(MatPaginator) paginator!: MatPaginator;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {
        this.titleService.setTitle('All feeds');
    }

    ngAfterViewInit() {
        this.dataSource.paginator = this.paginator;
    }

    ngOnInit(): void {
        this.loading = true;
        this.apiService.GetFeeds().subscribe({
            next: (data) => {
                this.loading = false;
                this.feeds = data;
                this.dataSource = new MatTableDataSource(this.feeds);
                this.dataSource.sort = this.sort!;
                this.dataSource.paginator = this.paginator;
            },
            error: (error) => {
                this.loading = false;
                this.error = error;
            },
        });
    }
}
