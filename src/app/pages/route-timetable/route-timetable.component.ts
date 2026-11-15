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

interface TimetableStop { id: string; name: string; position: number; minSequence: number; }
interface TimetableTrip { id: string; headsign: string; firstDeparture: string | null; directionId: number | null; }
interface DirectionGroup { key: string; directionId: number | null; orientation: string | null; label: string; tripCount: number; }

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
    selectedKey: string | undefined = undefined; // undefined = not chosen yet

    private readonly tripGroup = new Map<string, string>();

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
                // Deep-links: ?direction=<group key, e.g. 0, 1, null-fwd> and ?date=yyyy-MM-dd
                const dirParam = this.activatedRoute.snapshot.queryParamMap.get('direction');
                if (dirParam !== null && this.directions.some((d) => d.key === dirParam)) {
                    this.selectedKey = dirParam;
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
        // Feeds may omit trips.direction_id (GTFS marks it optional); those trips all land in
        // one "unknown" bucket that mixes both physical directions, which makes a single pivot
        // meaningless. Split that bucket by each trip's physical orientation (does departure
        // time increase with stop_sequence?) so every tab is a coherent one-way timetable.
        const tripsById = new Map<string, GTFSRouteTimetableRow[]>();
        for (const row of this.allRows) {
            const trip = tripsById.get(row.tripId);
            if (trip) {
                trip.push(row);
            } else {
                tripsById.set(row.tripId, [row]);
            }
        }
        this.tripGroup.clear();
        const groups = new Map<string, { key: string; directionId: number | null; orientation: string | null; headsigns: Map<string, number>; tripIds: Set<string> }>();
        for (const [tripId, trip] of tripsById) {
            const ordered = [...trip].sort((a, b) => a.stopSequence - b.stopSequence);
            const first = ordered[0];
            const last = ordered[ordered.length - 1];
            const orientation = ordered.length >= 2 && first.departureTime && last.departureTime &&
                this.serviceTimeKey(first.departureTime) > this.serviceTimeKey(last.departureTime)
                ? 'rev' : 'fwd';
            const directionId = trip[0].directionId ?? null;
            const key = directionId == null ? `null-${orientation}` : String(directionId);
            this.tripGroup.set(tripId, key);
            if (!groups.has(key)) {
                groups.set(key, {
                    key,
                    directionId,
                    orientation: directionId == null ? orientation : null,
                    headsigns: new Map(),
                    tripIds: new Set(),
                });
            }
            const g = groups.get(key)!;
            g.tripIds.add(tripId);
            if (trip[0].tripHeadsign) {
                g.headsigns.set(trip[0].tripHeadsign, (g.headsigns.get(trip[0].tripHeadsign) ?? 0) + 1);
            }
        }
        this.directions = [...groups.values()]
            .map((g) => ({
                key: g.key,
                directionId: g.directionId,
                orientation: g.orientation,
                label: this.directionLabel(g.directionId, g.headsigns),
                tripCount: g.tripIds.size,
            }))
            .sort((a, b) => (a.directionId ?? 99) - (b.directionId ?? 99) || a.key.localeCompare(b.key));

        if (this.selectedKey === undefined && this.directions.length > 0) {
            this.selectedKey = this.directions[0].key;
        }
    }

    private directionLabel(directionId: number | null, headsigns: Map<string, number>): string {
        const headsign = [...headsigns.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        const dir = directionId === null ? 'Unknown direction' : `Direction ${directionId === 0 ? '0 (outbound)' : '1 (inbound)'}`;
        return headsign ? `${dir} · ${headsign}` : dir;
    }

    selectDirection(key: string): void {
        this.selectedKey = key;
        this.applyDirection();
        this.updateUrl({ direction: key });
    }

    private updateUrl(params: Record<string, string>): void {
        this.router.navigate([], {
            relativeTo: this.activatedRoute,
            queryParams: params,
            queryParamsHandling: 'merge',
        });
    }

    private applyDirection(): void {
        const rows = this.selectedKey === undefined
            ? this.allRows
            : this.allRows.filter((r) => this.tripGroup.get(r.tripId) === this.selectedKey);
        this.buildPivot(rows);
    }

    // Service-day sort key: times before 04:00 belong to the previous night and are
    // listed after 23:xx, like printed timetables (00:04 -> 24:04).
    private serviceTimeKey(t: string): number {
        const h = parseInt(t.substring(0, 2), 10);
        return (h < 4 ? h + 24 : h) * 3600 + parseInt(t.substring(3, 5), 10) * 60 + parseInt(t.substring(6, 8), 10);
    }

    private median(values: number[]): number {
        if (values.length === 0) return Number.MAX_SAFE_INTEGER;
        const sorted = [...values].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private buildPivot(rows: GTFSRouteTimetableRow[]): void {
        // Stop order = each stop's median relative position within the selected direction's
        // own trips (a trip's stops ordered by departure time). Position-based rather than
        // time-based, so stops served by only some trips still land where they physically
        // occur; and rather than stop_sequence-based, since that is a canonical route-level
        // order shared by both directions and feeds emit sentinel values (999999) for stops
        // that sit mid-route.
        const tripsById = new Map<string, GTFSRouteTimetableRow[]>();
        for (const row of rows) {
            const trip = tripsById.get(row.tripId);
            if (trip) {
                trip.push(row);
            } else {
                tripsById.set(row.tripId, [row]);
            }
        }
        const stopPositions: Record<string, { name: string; minSeq: number; positions: number[] }> = {};
        for (const trip of tripsById.values()) {
            const ordered = [...trip].sort((a, b) =>
                this.serviceTimeKey(a.departureTime ?? '00:00:00') - this.serviceTimeKey(b.departureTime ?? '00:00:00') ||
                a.stopSequence - b.stopSequence);
            const denom = Math.max(1, ordered.length - 1);
            ordered.forEach((row, index) => {
                if (!stopPositions[row.stopId]) {
                    stopPositions[row.stopId] = { name: row.stopName, minSeq: row.stopSequence, positions: [] };
                }
                const stat = stopPositions[row.stopId];
                stat.minSeq = Math.min(stat.minSeq, row.stopSequence);
                stat.positions.push(index / denom);
            });
        }
        this.timetableStops = Object.entries(stopPositions)
            .map(([id, v]) => ({ id, name: v.name, position: this.median(v.positions), minSequence: v.minSeq }))
            .sort((a, b) => a.position - b.position || a.minSequence - b.minSequence);

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
