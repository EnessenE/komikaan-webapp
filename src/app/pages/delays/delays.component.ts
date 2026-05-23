import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { ApiService } from '../../services/api.service';
import { Alert } from '../../models/gtfsalert';
import { TopDelayedStop } from '../../models/top-delayed-stop';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { ErrorComponent } from '../../comps/error/error.component';
import { gtfsTypeLabel } from '../../utils/gtfs-type.utils';

interface AlertWithFeed extends Alert {
    feedId: string;
    feedName: string;
}

type SortBy = 'severity' | 'recent' | 'effect';

@Component({
    selector: 'app-delays',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink, LoadingComponent, ErrorComponent],
    templateUrl: './delays.component.html',
    styleUrl: './delays.component.scss',
})
export class DelaysComponent implements OnInit, OnDestroy {
    feeds: string[] = [];
    realtimeFeedNames: string[] = [];
    selectedFeed = 'all';
    
    loading = false;
    loadingAlerts = false;
    loadingTopDelays = false;
    error: HttpErrorResponse | undefined;
    
    alerts: AlertWithFeed[] = [];
    filteredAlerts: AlertWithFeed[] = [];
    topDelayedStops: TopDelayedStop[] = [];
    
    sortBy: SortBy = 'severity';
    severityFilter: string | undefined;
    effectFilter: string | undefined;

    private feedsSub: Subscription | undefined;
    private alertsSub: Subscription | undefined;
    private topDelaysSub: Subscription | undefined;

    constructor(
        private readonly apiService: ApiService,
        private readonly titleService: Title,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
    ) {
        this.titleService.setTitle('Delays & Cancellations');
    }

    ngOnInit(): void {
        this.readFiltersFromUrl();
        this.loadFeeds();
    }

    ngOnDestroy(): void {
        this.feedsSub?.unsubscribe();
        this.alertsSub?.unsubscribe();
        this.topDelaysSub?.unsubscribe();
    }

    private loadFeeds(): void {
        this.loading = true;
        this.feedsSub = forkJoin({
            all: this.apiService.GetFeedNames(),
            realtime: this.apiService.GetRealtimeFeedNames(),
        }).subscribe({
            next: ({ all, realtime }) => {
                this.feeds = all ?? [];
                this.realtimeFeedNames = realtime ?? [];

                if (this.selectedFeed !== 'all' && !this.realtimeFeedNames.some((feed) => feed === this.selectedFeed)) {
                    this.selectedFeed = 'all';
                }

                this.loadAlerts();
                this.loading = false;
            },
            error: (err) => {
                this.error = err;
                this.loading = false;
            },
        });
    }

    onFeedChange(): void {
        this.updateUrl();
        this.loadAlerts();
    }

    clearFilters(): void {
        this.selectedFeed = 'all';
        this.sortBy = 'severity';
        this.severityFilter = undefined;
        this.effectFilter = undefined;
        this.updateUrl();
        this.loadAlerts();
    }

    private loadAlerts(): void {
        this.loadingAlerts = true;
        this.loadingTopDelays = true;
        this.error = undefined;

        const selectedFeed = this.selectedFeed;
        const useAllFeeds = selectedFeed === 'all';

        const alertsRequest = useAllFeeds
            ? forkJoin(
                this.feeds.map((feed) =>
                    this.apiService.GetFeedAlerts(feed).pipe(
                        map((alerts) =>
                            (alerts ?? []).map((alert) => ({
                                ...alert,
                                feedId: feed,
                                feedName: feed,
                            })),
                        ),
                    ),
                ),
            ).pipe(map((allAlerts) => allAlerts.flat()))
            : this.apiService.GetFeedAlerts(selectedFeed).pipe(
                map((alerts) =>
                    (alerts ?? []).map((alert) => ({
                        ...alert,
                        feedId: selectedFeed,
                        feedName: selectedFeed,
                    })),
                ),
            );

        this.alertsSub?.unsubscribe();
        this.topDelaysSub?.unsubscribe();

        this.alertsSub = alertsRequest.subscribe({
            next: (alerts) => {
                this.alerts = alerts;
                this.applyFiltersAndSort();
                this.loadingAlerts = false;
            },
            error: (err) => {
                this.error = err;
                this.loadingAlerts = false;
            },
        });

        this.topDelaysSub = this.apiService.GetTopDelayedStops(100, useAllFeeds ? undefined : selectedFeed).subscribe({
            next: (topDelayedStops) => {
                this.topDelayedStops = topDelayedStops ?? [];
                this.loadingTopDelays = false;
            },
            error: (err) => {
                this.error = err;
                this.loadingTopDelays = false;
            },
        });
    }

    onSortChange(): void {
        this.updateUrl();
        this.applyFiltersAndSort();
    }

    onSeverityFilterChange(): void {
        this.updateUrl();
        this.applyFiltersAndSort();
    }

    onEffectFilterChange(): void {
        this.updateUrl();
        this.applyFiltersAndSort();
    }

    private applyFiltersAndSort(): void {
        let filtered = [...this.alerts];

        // Apply filters
        if (this.severityFilter) {
            filtered = filtered.filter(a => a.severityLevel === this.severityFilter);
        }

        if (this.effectFilter) {
            filtered = filtered.filter(a => a.effect === this.effectFilter);
        }

        // Apply sorting
        filtered.sort((a, b) => {
            switch (this.sortBy) {
                case 'severity':
                    const severityOrder: Record<string, number> = {
                        'SEVERE': 0,
                        'WARNING': 1,
                        'INFO': 2,
                        'UNKNOWN': 3,
                    };
                    const aSev = severityOrder[a.severityLevel] ?? 999;
                    const bSev = severityOrder[b.severityLevel] ?? 999;
                    return aSev - bSev;

                case 'recent':
                    const aTime = new Date(a.startTime).getTime();
                    const bTime = new Date(b.startTime).getTime();
                    return bTime - aTime; // Most recent first

                case 'effect':
                    return (a.effect || '').localeCompare(b.effect || '');

                default:
                    return 0;
            }
        });

        this.filteredAlerts = filtered;
    }

    getSeverityBadgeClass(severity: string): string {
        switch (severity.toLowerCase()) {
            case 'severe':
                return 'bg-danger';
            case 'warning':
                return 'bg-warning text-dark';
            case 'info':
                return 'bg-info';
            default:
                return 'bg-secondary';
        }
    }

    getEffectBadgeClass(effect: string): string {
        switch (effect?.toLowerCase()) {
            case 'no_service':
                return 'bg-danger';
            case 'reduced_service':
                return 'bg-warning text-dark';
            case 'significant_delays':
                return 'bg-warning text-dark';
            case 'minor_delay':
                return 'bg-info';
            case 'detour':
                return 'bg-info';
            case 'modified_service':
                return 'bg-secondary';
            case 'other_effect':
                return 'bg-secondary';
            default:
                return 'bg-light text-dark border';
        }
    }

    getUniqueSeverities(): string[] {
        return Array.from(new Set(this.alerts.map(a => a.severityLevel))).sort();
    }

    getUniqueEffects(): string[] {
        return Array.from(new Set(this.alerts.map(a => a.effect).filter(Boolean))) as string[];
    }

    formatDate(date: string | Date): string {
        const dateObj = typeof date === 'string' ? new Date(date) : date;
        return dateObj.toLocaleString();
    }

    getActiveAlerts(): AlertWithFeed[] {
        const now = new Date();
        return this.filteredAlerts.filter(a => {
            const startTime = new Date(a.startTime);
            const endTime = new Date(a.endTime);
            return startTime <= now && now <= endTime;
        });
    }

    getUpcomingAlerts(): AlertWithFeed[] {
        const now = new Date();
        return this.filteredAlerts.filter(a => {
            const startTime = new Date(a.startTime);
            return startTime > now;
        });
    }

    getPastAlerts(): AlertWithFeed[] {
        const now = new Date();
        return this.filteredAlerts.filter(a => {
            const endTime = new Date(a.endTime);
            return endTime < now;
        });
    }

    formatDelaySeconds(seconds: number | null | undefined): string {
        if (seconds === null || seconds === undefined) return 'N/A';
        const minutes = Math.round(seconds / 60);
        return minutes + ' min';
    }

    get hasActiveFilters(): boolean {
        return this.selectedFeed !== 'all'
            || this.sortBy !== 'severity'
            || !!this.severityFilter
            || !!this.effectFilter;
    }

    get activeFilterLabels(): string[] {
        const labels: string[] = [];
        if (this.selectedFeed !== 'all') labels.push('Feed: ' + this.selectedFeed);
        if (this.sortBy !== 'severity') labels.push('Sort: ' + this.sortBy);
        if (this.severityFilter) labels.push('Severity: ' + this.severityFilter);
        if (this.effectFilter) labels.push('Effect: ' + this.effectFilter);
        return labels;
    }

    getStopTypeName(stopType: number | string): string {
        return gtfsTypeLabel(stopType);
    }

    private readFiltersFromUrl(): void {
        const params = this.route.snapshot.queryParamMap;

        this.selectedFeed = params.get('feed') ?? 'all';
        this.sortBy = (params.get('sort') as SortBy) ?? 'severity';
        this.severityFilter = params.get('severity') ?? undefined;
        this.effectFilter = params.get('effect') ?? undefined;
    }

    private updateUrl(): void {
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
                feed: this.selectedFeed !== 'all' ? this.selectedFeed : null,
                sort: this.sortBy !== 'severity' ? this.sortBy : null,
                severity: this.severityFilter || null,
                effect: this.effectFilter || null,
            },
            queryParamsHandling: 'merge',
        }).catch(() => {
            // Intentionally ignored: filter state is still applied in-memory.
        });
    }
}
