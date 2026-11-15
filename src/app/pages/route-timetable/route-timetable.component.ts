import { ChangeDetectionStrategy, Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
    }

    private applyDirection(): void {
        const rows = this.selectedDirection === undefined
            ? this.allRows
            : this.allRows.filter((r) => (r.directionId ?? null) === this.selectedDirection);
        this.buildPivot(rows);
    }

    private buildPivot(rows: GTFSRouteTimetableRow[]): void {
        const stopLookup: Record<string, TimetableStop> = {};
        for (const row of rows) {
            if (!stopLookup[row.stopId]) {
                stopLookup[row.stopId] = { id: row.stopId, name: row.stopName, sequence: row.stopSequence };
            }
        }
        this.timetableStops = Object.values(stopLookup).sort((a, b) => a.sequence - b.sequence);

        const tripLookup: Record<string, TimetableTrip> = {};
        for (const row of rows) {
            if (!tripLookup[row.tripId]) {
                tripLookup[row.tripId] = { id: row.tripId, headsign: row.tripHeadsign, firstDeparture: null, directionId: row.directionId ?? null };
            }
        }
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
            return a.firstDeparture.localeCompare(b.firstDeparture);
        });

        this.timetableLookup = {};
        for (const row of rows) {
            if (!this.timetableLookup[row.stopId]) {
                this.timetableLookup[row.stopId] = {};
            }
            this.timetableLookup[row.stopId][row.tripId] = row.departureTime ?? null;
        }
    }

    getCell(stopId: string, tripId: string): string {
        const t = this.timetableLookup[stopId]?.[tripId];
        if (!t) return '—';
        return t.substring(0, 5);
    }

    get minDate(): string { return this.routeDetails?.firstRun ?? ''; }
    get maxDate(): string { return this.routeDetails?.lastRun ?? ''; }

    onDateChange(date: string): void {
        if (!date || !this.routeDetails) return;
        this.selectedDate = date;
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
