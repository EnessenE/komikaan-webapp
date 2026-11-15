import { ChangeDetectionStrategy, Component, OnDestroy, OnInit  } from '@angular/core';
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

export interface NextDeparture { tripId: string; headsign: string; time: string | null; directionId: number | null; }

@Component({
    changeDetection: ChangeDetectionStrategy.Default,
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

    // Compact "next departures" summary; the full pivot timetable lives on its own page
    nextDepartures: NextDeparture[] = [];

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
                    this.buildNextDepartures();
                } catch (e) {
                    console.error('[RouteDetails] buildNextDepartures failed:', e);
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

    private buildNextDepartures(): void {
        const rows = this.routeDetails?.timetable ?? [];
        if (rows.length === 0) {
            this.nextDepartures = [];
            return;
        }
        const firstStopId = [...new Set(rows.map((r) => r.stopId))]
            .map((id) => ({ id, seq: Math.min(...rows.filter((r) => r.stopId === id).map((r) => r.stopSequence)) }))
            .sort((a, b) => a.seq - b.seq)[0]?.id;
        const trips: Record<string, NextDeparture> = {};
        for (const row of rows) {
            if (!trips[row.tripId]) {
                trips[row.tripId] = { tripId: row.tripId, headsign: row.tripHeadsign, time: null, directionId: row.directionId ?? null };
            }
            if (row.stopId === firstStopId && !trips[row.tripId].time) {
                trips[row.tripId].time = row.departureTime ?? null;
            }
        }
        this.nextDepartures = Object.values(trips)
            .sort((a, b) => this.serviceTimeKey(a.time) - this.serviceTimeKey(b.time))
            .slice(0, 8);
    }

    // Service-day sort key: times before 04:00 belong to the previous night (00:04 -> 24:04)
    private serviceTimeKey(t: string | null): number {
        if (!t) return Number.MAX_SAFE_INTEGER;
        const h = parseInt(t.substring(0, 2), 10);
        return (h < 4 ? h + 24 : h) * 3600 + parseInt(t.substring(3, 5), 10) * 60 + parseInt(t.substring(6, 8), 10);
    }

    get minDate(): string { return this.routeDetails?.firstRun ?? ''; }
    get maxDate(): string { return this.routeDetails?.lastRun ?? ''; }

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