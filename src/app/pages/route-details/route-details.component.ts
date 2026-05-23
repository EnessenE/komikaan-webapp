import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
    circle,
    featureGroup,
    latLng,
    Layer,
    Map as LeafletMap,
    polyline,
    tileLayer,
    FeatureGroup,
} from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

import { ApiService } from '../../services/api.service';
import { GTFSRouteDetails } from '../../models/gtfsroute-details';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { ErrorComponent } from '../../comps/error/error.component';
import { RouteComponent } from '../../comps/route/route.component';

export interface TimetableStop { id: string; name: string; sequence: number; }
export interface TimetableTrip { id: string; headsign: string; firstDeparture: string | null; }

type TimetableLookup = Record<string, Record<string, string | null>>;

@Component({
    selector: 'app-route-details',
    standalone: true,
    imports: [CommonModule, RouterLink, LeafletModule, LoadingComponent, ErrorComponent, RouteComponent],
    templateUrl: './route-details.component.html',
    styleUrl: './route-details.component.scss',
})
export class RouteDetailsComponent implements OnInit, OnDestroy {
    routeDetails: GTFSRouteDetails | undefined;
    loading = false;
    error: HttpErrorResponse | undefined;

    map: LeafletMap | undefined;
    markerLayers: FeatureGroup = featureGroup();
    routeLineLayer: FeatureGroup = featureGroup();
    stopLineLayer: FeatureGroup = featureGroup();

    // Timetable pivot data
    timetableStops: TimetableStop[] = [];
    timetableTrips: TimetableTrip[] = [];
    timetableLookup: TimetableLookup = {};
    timetableLoading = false;
    selectedDate = new Date().toISOString().split('T')[0];

    options = {
        zoom: 12,
        center: latLng(52.0907, 5.1214),
        zoomControl: true,
        attributionControl: false,
    };

    baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    layers: Layer[] = [this.baseLayer, this.stopLineLayer, this.routeLineLayer, this.markerLayers];
    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {
            'Stops': this.markerLayers,
            'Route Shape': this.routeLineLayer,
            'Stop Connector': this.stopLineLayer,
        },
    };

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
        this.titleService.setTitle('Loading route...');

        this.apiService.GetRoute(dataOrigin, routeId).subscribe({
            next: (data) => {
                this.routeDetails = data;
                this.loading = false;
                this.titleService.setTitle((data.shortName || data.longName || data.id) + ' · ' + (data.longName || '') + ' · Route');
                try {
                    this.drawMapFeatures();
                } catch (e) {
                    console.error('[RouteDetails] drawMapFeatures failed:', e);
                }
                try {
                    this.buildTimetable();
                } catch (e) {
                    console.error('[RouteDetails] buildTimetable failed:', e);
                }
            },
            error: (error: HttpErrorResponse) => {
                this.error = error;
                this.loading = false;
                this.titleService.setTitle('Route not found');
            },
        });
    }

    drawMapFeatures(): void {
        this.markerLayers.clearLayers();
        this.routeLineLayer.clearLayers();
        this.stopLineLayer.clearLayers();

        // Shape polyline — detailed road-following geometry from GTFS shapes
        const shapePoints = this.routeDetails?.shapes?.map((shape) => latLng(shape.latitude, shape.longitude)) ?? [];
        if (shapePoints.length > 1) {
            const shapeLine = polyline(shapePoints, { color: '#3b82f6', weight: 4, opacity: 0.85 });
            this.routeLineLayer.addLayer(shapeLine);
        }

        // Stop-to-stop backbone line — connects stops in canonical route order
        const stopPoints: ReturnType<typeof latLng>[] = [];
        this.routeDetails?.stops?.forEach((stop) => {
            const primaryCoordinate = stop.adjustedCoordinates?.[0];
            if (!primaryCoordinate) {
                return;
            }
            stopPoints.push(latLng(primaryCoordinate.latitude, primaryCoordinate.longitude));

            const stopMarker = circle([primaryCoordinate.latitude, primaryCoordinate.longitude], {
                radius: 50,
                color: '#0f172a',
                fillColor: '#ffffff',
                fillOpacity: 0.85,
                weight: 2,
            });
            stopMarker.bindPopup(`
                <div class="stop-popup">
                    <strong>${stop.name}</strong><br/>
                    <small class="text-muted">${stop.stopType}</small><br/>
                    <a href="/stops/${encodeURIComponent(stop.id)}/${encodeURIComponent(stop.stopType)}" class="btn btn-sm btn-primary mt-2">View Departures</a>
                </div>
            `);

            this.markerLayers.addLayer(stopMarker);
        });

        if (stopPoints.length > 1) {
            // When a detailed shape is available, draw the stop connector as a dashed grey underlay.
            // When there is no shape, draw it in the same blue as the main route line.
            const hasShape = shapePoints.length > 1;
            const stopLine = polyline(stopPoints, {
                color: hasShape ? '#94a3b8' : '#3b82f6',
                weight: hasShape ? 2 : 4,
                opacity: hasShape ? 0.55 : 0.85,
                dashArray: hasShape ? '6 5' : undefined,
            });
            this.stopLineLayer.addLayer(stopLine);
        }

        this.updateMapBounds();
    }

    private buildTimetable(): void {
        const rows = this.routeDetails?.timetable ?? [];

        // Unique stops, deduplicated by id, sorted by sequence
        const stopLookup: Record<string, TimetableStop> = {};
        for (const row of rows) {
            if (!stopLookup[row.stopId]) {
                stopLookup[row.stopId] = { id: row.stopId, name: row.stopName, sequence: row.stopSequence };
            }
        }
        this.timetableStops = Object.values(stopLookup).sort((a, b) => a.sequence - b.sequence);

        // Unique trips, keyed by id
        const tripLookup: Record<string, TimetableTrip> = {};
        for (const row of rows) {
            if (!tripLookup[row.tripId]) {
                tripLookup[row.tripId] = { id: row.tripId, headsign: row.tripHeadsign, firstDeparture: null };
            }
        }
        // Attach first stop's departure time so we can sort trips chronologically
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

        // Build O(1) lookup: stopId → tripId → formatted time
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
        return t.substring(0, 5); // "HH:mm:ss" → "HH:mm"
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
                if (this.routeDetails) this.routeDetails = { ...this.routeDetails, timetable: rows };
                try { this.buildTimetable(); } catch (e) { console.error(e); }
                this.timetableLoading = false;
            },
            error: () => {
                if (this.routeDetails) this.routeDetails = { ...this.routeDetails, timetable: [] };
                try { this.buildTimetable(); } catch (e) { /* empty */ }
                this.timetableLoading = false;
            },
        });
    }

    onMapReady(map: LeafletMap): void {
        this.map = map;
        setTimeout(() => {
            this.map?.invalidateSize();
            this.updateMapBounds();
        }, 200);
    }

    onResize(): void {
        this.map?.invalidateSize();
    }

    private updateMapBounds(): void {
        if (!this.map) {
            return;
        }

        const hasLayers = this.markerLayers.getLayers().length > 0 || this.routeLineLayer.getLayers().length > 0;
        if (!hasLayers) {
            return;
        }

        const bounds = featureGroup([this.routeLineLayer, this.markerLayers]).getBounds();
        if (bounds.isValid()) {
            this.map.fitBounds(bounds, { padding: [40, 40] });
        }
    }
}