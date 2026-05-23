import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
    circle,
    featureGroup,
    latLng,
    Layer,
    Map as LeafletMap,
    tileLayer,
    FeatureGroup,
} from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

import { ApiService } from '../../services/api.service';
import { TrainStationPerformance } from '../../models/train-station-performance';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { ErrorComponent } from '../../comps/error/error.component';
import { gtfsTypeLabel } from '../../utils/gtfs-type.utils';

@Component({
    selector: 'app-train-stations',
    standalone: true,
    imports: [CommonModule, RouterLink, LeafletModule, LoadingComponent, ErrorComponent],
    templateUrl: './train-stations.component.html',
    styleUrl: './train-stations.component.scss',
})
export class TrainStationsComponent implements OnInit, OnDestroy {
    loading = false;
    error: HttpErrorResponse | undefined;
    lastUpdated: Date | undefined;

    map: LeafletMap | undefined;
    stationMarkerLayer: FeatureGroup = featureGroup();
    
    options = {
        zoom: 8,
        minZoom: 8,
        maxZoom: 16,
        center: latLng(52.1326, 5.2913),
        zoomControl: true,
        attributionControl: false,
    };

    private initialLat: number | undefined;
    private initialLon: number | undefined;
    private initialZoom: number | undefined;

    baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    layers: Layer[] = [this.baseLayer, this.stationMarkerLayer];
    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {
            'Train Stations': this.stationMarkerLayer,
        },
    };

    stationsList: TrainStationPerformance[] = [];

    private stationsSub: Subscription | undefined;
    private loadTimeout: ReturnType<typeof setTimeout> | undefined;

    constructor(
        private readonly apiService: ApiService,
        private readonly titleService: Title,
        private readonly route: ActivatedRoute,
        private readonly location: Location,
    ) {
        this.titleService.setTitle('Train Stations Map · On-Time Performance');
    }

    ngOnInit(): void {
        const p = this.route.snapshot.queryParamMap;
        const lat = parseFloat(p.get('lat') ?? '');
        const lon = parseFloat(p.get('lon') ?? '');
        const zoom = parseInt(p.get('zoom') ?? '', 10);
        if (isFinite(lat) && isFinite(lon)) {
            this.initialLat = lat;
            this.initialLon = lon;
            this.options = { ...this.options, center: latLng(lat, lon) };
        }
        if (isFinite(zoom) && zoom >= 8) {
            this.initialZoom = zoom;
            this.options = { ...this.options, zoom };
        }
    }

    ngOnDestroy(): void {
        this.stationsSub?.unsubscribe();
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }
    }

    onMapReady(map: LeafletMap): void {
        this.map = map;
        this.refreshMapSize();
        this.scheduleViewportLoad(true);
        map.on('moveend', () => {
            this.updateUrl();
            this.scheduleViewportLoad(false);
        });
        map.on('zoomend', () => {
            this.updateUrl();
            this.displayStations();
            this.scheduleViewportLoad(false);
        });
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        this.refreshMapSize();
    }

    private scheduleViewportLoad(immediate: boolean): void {
        if (!this.map) return;

        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }

        const delayMs = immediate ? 0 : 220;
        this.loadTimeout = setTimeout(() => this.loadStationsForViewport(), delayMs);
    }

    private loadStationsForViewport(): void {
        if (!this.map) return;

        const bounds = this.map.getBounds();
        const zoom = this.map.getZoom();
        const limit = zoom <= 5 ? 2200 : zoom <= 7 ? 1500 : zoom <= 9 ? 1000 : 700;

        this.loading = true;
        this.stationsSub?.unsubscribe();
        this.stationsSub = this.apiService.GetTrainStationPerformance(
            bounds.getSouth(),
            bounds.getNorth(),
            bounds.getWest(),
            bounds.getEast(),
            limit,
        ).subscribe({
            next: (stations) => {
                this.stationsList = stations ?? [];
                this.displayStations();
                this.loading = false;
                this.lastUpdated = new Date();
            },
            error: (err) => {
                this.error = err;
                this.loading = false;
            },
        });
    }

    private displayStations(): void {
        if (!this.map) return;

        this.stationMarkerLayer.clearLayers();
        const radius = this.getMarkerRadius(this.map.getZoom());

        for (const stationData of this.stationsList) {
            const stationLatLng = latLng(stationData.latitude, stationData.longitude);
            
            // Color based on on-time percentage; grey = no live data
            let color = '#9e9e9e';
            if (stationData.totalTripsCount > 0) {
                color = '#28a745'; // Green - good
                if (stationData.onTimePercentage < 80) {
                    color = '#ffc107'; // Yellow - warning
                }
                if (stationData.onTimePercentage < 60) {
                    color = '#dc3545'; // Red - bad
                }
            }

            const marker = circle(stationLatLng, {
                radius,
                color,
                fillColor: color,
                fillOpacity: 0.7,
                weight: 2,
            });

            const onTimeLabel = stationData.totalTripsCount > 0
                ? `On-time: ${stationData.onTimePercentage.toFixed(1)}%`
                : 'No live data';
            const stopUrl = `/stops/${encodeURIComponent(stationData.primaryStopId)}/${stationData.stopType}`;
            const performanceText = `
                <strong>${stationData.stopName}</strong><br/>
                <small class="text-muted">Type ${stationData.stopType}</small><br/>
                <div class="mt-2">
                    <div class="mb-2">
                        <span class="badge bg-info">${onTimeLabel}</span>
                    </div>
                    <div class="mb-2">
                        <span class="badge bg-warning">Delayed: ${stationData.delayCount}</span>
                        <span class="badge bg-danger">Canceled: ${stationData.cancellationCount}</span>
                        <span class="badge bg-secondary">Total: ${stationData.totalTripsCount}</span>
                    </div>
                    <a href="${stopUrl}" style="display:inline-block;margin-top:8px;padding:4px 10px;background:#0d6efd;color:#fff;border-radius:4px;text-decoration:none;font-size:0.85rem">View Departures</a>
                </div>
            `;
            marker.bindPopup(performanceText);
            
            this.stationMarkerLayer.addLayer(marker);
        }
    }

    private updateUrl(): void {
        if (!this.map) return;
        const c = this.map.getCenter();
        const z = this.map.getZoom();
        const url = this.location.prepareExternalUrl(
            `/train-stations?lat=${c.lat.toFixed(5)}&lon=${c.lng.toFixed(5)}&zoom=${z}`,
        );
        this.location.replaceState(url);
    }

    private refreshMapSize(): void {
        if (!this.map) {
            return;
        }

        this.map.invalidateSize();
        setTimeout(() => this.map?.invalidateSize(), 0);
        setTimeout(() => this.map?.invalidateSize(), 200);
    }

    private getMarkerRadius(zoom: number): number {
        if (zoom <= 5) return 3200;
        if (zoom <= 6) return 2400;
        if (zoom <= 7) return 1600;
        if (zoom <= 8) return 1000;
        if (zoom <= 9) return 700;
        if (zoom <= 10) return 420;
        if (zoom <= 12) return 250;
        return 150;
    }

    getPerformanceColor(percentage: number): string {
        if (percentage >= 80) return '#28a745';
        if (percentage >= 60) return '#ffc107';
        return '#dc3545';
    }

    getPerformanceBadgeClass(percentage: number): string {
        if (percentage >= 80) return 'bg-success';
        if (percentage >= 60) return 'bg-warning';
        return 'bg-danger';
    }

    getStopTypeLabel(stopType: number | string): string {
        return gtfsTypeLabel(stopType);
    }
}
