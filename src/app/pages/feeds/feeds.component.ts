import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { Feed } from '../../models/feed';

@Component({
    selector: 'app-feeds',
    standalone: true,
    imports: [RouterLink],
    templateUrl: './feeds.component.html',
    styleUrl: './feeds.component.scss',
})
export class FeedsComponent implements OnInit {
    feeds: Feed[] | undefined;
    loading: boolean = false;
    error: any;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        this.apiService.GetFeeds().subscribe({
            next: (data) => {
                this.loading = false;
                this.feeds = data;
            },
            error: (error) => (this.error = error),
        });
    }
}