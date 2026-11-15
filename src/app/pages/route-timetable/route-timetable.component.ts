import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';

import { ApiService } from '../../services/api.service';
import { GTFSRouteDetails } from '../../models/gtfsroute-details';
import { GTFSRouteTimetableRow } from '../../models/gtfsroute-timetable-row';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { ErrorComponent } from '../../comps/error/error.component';
import { RouteComponent } from '../../comps/route/route.component';

interface TimetableStop { id: string; name: string; sequence: number; }
interface TimetableTrip { id: string; headsign: string; firstDeparture: string | null; directionId: number | null; }
interface DirectionGroup { directionId: number | null; label: string; tripCount: number; }

type TimetableLookup = Record<string, Record<string, string | null>>;

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
    selector: 'app-route-timetable',
    standalone: true,
    imports: [CommonModule, RouterLink, LoadingComponent, ErrorComponent, RouteComponent],
    templateUrl: './route-timetable.component.html',
    styleUrl: './route-timetable.component.scss',
})
export class RouteTimetableComponent implements OnInit, OnDestroy {
    routeDetails: GTFSRouteDetails | undefined;
    loading = false;
    error: HttpErrorResponse | undefined;

    timetableLoading = false;
    selectedDate = new Date().toISOString().split('T')[0];

    allRows: GTFSRouteTimetableRow[] = [];
    directions: DirectionGroup[] = [];
    selectedDirection: number | null | undefined = undefined; // undefined = not chosen yet

    timetableStops: TimetableStop[] = [];
    timetableTrips: TimetableTrip[] = [];
    timetableLookup: TimetableLookup = {};

    private routeSub: Subscription | undefined;

    constructor(
        private readonly activatedRoute: ActivatedRoute,
        private readonly router: Router,
        private readonly apiService: ApiService,
        private readonly titleService: Title,
    ) {}

    ngOnInit(): void {
        this.routeSub = this.activatedRoute.params.subscribe((params) => {
            this.loadRoute(params['dataOrigin'], params['id']);
        });
    }

    ngOnDestroy(): void {
        this.routeSub?.unsubscribe();
    }

    private loadRoute(dataOrigin: string, routeId: string): void {
        this.loading = true;
        this.error = undefined;
        this.routeDetails = undefined;
        this.titleService.setTitle('Loading timetable...');

        this.apiService.GetRoute(dataOrigin, routeId).subscribe({
            next: (data) => {
                this.routeDetails = data;
                this.loading = false;
                this.titleService.setTitle('Timetable · ' + (data.shortName || data.longName || data.id));
                this.allRows = data.timetable ?? [];
                this.buildDirections();
                // Deep-links: ?direction=0/1 and ?date=yyyy-MM-dd
                const dirParam = this.activatedRoute.snapshot.queryParamMap.get('direction');
                if (dirParam !== null && this.directions.some((d) => String(d.directionId ?? 'null') === dirParam)) {
                    this.selectedDirection = dirParam === 'null' ? null : Number(dirParam);
                }
                const dateParam = this.activatedRoute.snapshot.queryParamMap.get('date');
                if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
                    this.selectedDate = dateParam;
                    this.fetchTimetable(dateParam);
                    return;
                }
                this.applyDirection();
            },
            error: (error: HttpErrorResponse) => {
                this.error = error;
                this.loading = false;
                this.titleService.setTitle('Route not found');
            },
        });
    }

    private buildDirections(): void {
        const groups = new Map<string, { directionId: number | null; headsigns: Map<string, number>; tripIds: Set<string> }>();
        for (const row of this.allRows) {
            const key = row.directionId == null ? 'null' : String(row.directionId);
            if (!groups.has(key)) {
                groups.set(key, { directionId: row.directionId ?? null, headsigns: new Map(), tripIds: new Set() });
            }
            const g = groups.get(key)!;
            g.tripIds.add(row.tripId);
            if (row.tripHeadsign) {
                g.headsigns.set(row.tripHeadsign, (g.headsigns.get(row.tripHeadsign) ?? 0) + 1);
            }
        }
        this.directions = [...groups.values()]
            .map((g) => ({
                directionId: g.directionId,
                label: this.directionLabel(g.directionId, g.headsigns),
                tripCount: g.tripIds.size,
            }))
            .sort((a, b) => (a.directionId ?? 99) - (b.directionId ?? 99));

        if (this.selectedDirection === undefined && this.directions.length > 0) {
            this.selectedDirection = this.directions[0].directionId;
        }
    }

    private directionLabel(directionId: number | null, headsigns: Map<string, number>): string {
        const headsign = [...headsigns.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const dir = directionId === null ? 'Unknown direction' : `Direction ${directionId === 0 ? '0 (outbound)' : '1 (inbound)'}`;
        return headsign ? `${dir} · ${headsign}` : dir;
    }

    selectDirection(directionId: number | null): void {
        this.selectedDirection = directionId;
        this.applyDirection();
        this.updateUrl({ direction: directionId == null ? 'null' : String(directionId) });
    }

    private updateUrl(params: Record<string, string>): void {
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: params,
            queryParamsHandling: 'merge',
        });
    }

    private applyDirection(): void {
        const rows = this.selectedDirection === undefined
            ? this.allRows
            : this.allRows.filter((r) => (r.directionId ?? null) === this.selectedDirection);
        this.buildPivot(rows);
    }

    // Service-day sort key: times before 04:00 belong to the previous night and are
    // listed after 23:xx, like printed timetables (00:04 -> 24:04).
    private serviceTimeKey(t: string): number {
        const h = parseInt(t.substring(0, 2), 10);
        return (h < 4 ? h + 24 : h) * 3600 + parseInt(t.substring(3, 5), 10) * 60 + parseInt(t.substring(6, 8), 10);
    }

    private buildPivot(rows: GTFSRouteTimetableRow[]): void {
        // Stop order is derived chronologically from the selected direction's own trips:
        // a stop's position = its average departure time over those trips. The API's
        // stop_sequence is the global canonical order and is the same for both directions,
        // so it cannot be used to orient a single direction.
        const stopTimes: Record<string, { name: string; total: number; count: number }> = {};
        for (const row of rows) {
            if (!stopTimes[row.stopId]) {
                stopTimes[row.stopId] = { name: row.stopName, total: 0, count: 0 };
            }
            if (row.departureTime) {
                stopTimes[row.stopId].total += this.serviceTimeKey(row.departureTime);
                stopTimes[row.stopId].count++;
            }
        }
        this.timetableStops = Object.entries(stopTimes)
            .map(([id, v]) => ({ id, name: v.name, sequence: v.count > 0 ? v.total / v.count : Number.MAX_SAFE_INTEGER }))
            .sort((a, b) => a.sequence - b.sequence);

        const tripLookup: Record<string, TimetableTrip> = {};
        for (const row of rows) {
            if (!tripLookup[row.tripId]) {
                tripLookup[row.tripId] = { id: row.tripId, headsign: row.tripHeadsign, firstDeparture: null, directionId: row.directionId ?? null };
            }
        }
        // Trips are ordered earliest -> latest by their departure at this direction's first stop
        if (this.timetableStops.length > 0) {
            const firstStopId = this.timetableStops[0].id;
            for (const row of rows) {
                if (row.stopId === firstStopId) {
                    const trip = tripLookup[row.tripId];
                    if (trip && !trip.firstDeparture) trip.firstDeparture = row.departureTime ?? null;
                }
            }
        }
        this.timetableTrips = Object.values(tripLookup).sort((a, b) => {
            if (!a.firstDeparture) return 1;
            if (!b.firstDeparture) return -1;
            return this.serviceTimeKey(a.firstDeparture) - this.serviceTimeKey(b.firstDeparture);
        });

        this.timetableLookup = {};
        for (const row of rows) {
            if (!this.timetableLookup[row.stopId]) {
                this.timetableLookup[row.stopId] = {};
            }
            this.timetableLookup[row.stopId][row.tripId] = row.departureTime ?? null;
        }
    }

    // Display HH:mm; post-midnight times (before 04:00) are shown as 24h+/25h+ like printed
    // timetables, matching the service-day sort order.
    fmtTime(t: string | null | undefined): string {
        if (!t) return '—';
        const h = parseInt(t.substring(0, 2), 10);
        if (h < 4) {
            return (h + 24) + t.substring(2, 5);
        }
        return t.substring(0, 5);
    }

    getCell(stopId: string, tripId: string): string {
        return this.fmtTime(this.timetableLookup[stopId]?.[tripId]);
    }

    get minDate(): string { return this.routeDetails?.firstRun ?? ''; }
    get maxDate(): string { return this.routeDetails?.lastRun ?? ''; }

    onDateChange(date: string): void {
        if (!date || !this.routeDetails) return;
        this.selectedDate = date;
        this.updateUrl({ date });
        this.fetchTimetable(date);
    }

    private fetchTimetable(date: string): void {
        if (!this.routeDetails) return;
        const routeKey = this.routeDetails.id || this.routeDetails.shortName;
        this.timetableLoading = true;
        this.apiService.GetTimetable(this.routeDetails.dataOrigin, routeKey, date).subscribe({
            next: (rows) => {
                this.allRows = rows;
                this.buildDirections();
                this.applyDirection();
                this.timetableLoading = false;
            },
            error: () => {
                this.allRows = [];
                this.buildDirections();
                this.applyDirection();
                this.timetableLoading = false;
            },
        });
    }
}
