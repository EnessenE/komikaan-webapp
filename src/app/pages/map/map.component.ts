import { Component, HostListener, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import {
    canvas,
    circle,
    featureGroup,
    latLng,
    Layer,
    LeafletMouseEvent,
    Map as LeafletMap,
    polyline,
    tileLayer,
    FeatureGroup,
} from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

import { ApiService } from '../../services/api.service';
import { GTFSShape } from '../../models/gtfsshape';
import { GTFSSearchStop } from '../../models/gtfssearchstop';
import { MapViewportData } from '../../models/map-viewport-data';
import { ErrorComponent } from '../../comps/error/error.component';
import { gtfsTypeLabel, GTFS_TYPE_ORDER } from '../../utils/gtfs-type.utils';

@Component({
    selector: 'app-map',
    standalone: true,
    imports: [CommonModule, LeafletModule, ErrorComponent],
    templateUrl: './map.component.html',
    styleUrl: './map.component.scss',
})
export class MapComponent implements OnInit, OnDestroy {
    loading = false;
    error: HttpErrorResponse | undefined;
    lastUpdated: Date | undefined;
    minShapeZoom = 12;
    minStopZoom = 13;
    fullShapes = true;

    map: LeafletMap | undefined;
    routeLineLayer: FeatureGroup = featureGroup();
    stopMarkerLayer: FeatureGroup = featureGroup();
    
    options = {
        zoom: 7,
        minZoom: 3,
        maxZoom: 16,
        center: latLng(52.1326, 5.2913),
        zoomControl: true,
        attributionControl: false,
    };

    private initialLat: number | undefined;
    private initialLon: number | undefined;
    private initialZoom: number | undefined;

    baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    layers: Layer[] = [this.baseLayer, this.routeLineLayer, this.stopMarkerLayer];
    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {
            'Routes': this.routeLineLayer,
            'Stops': this.stopMarkerLayer,
        },
    };

    private dataSub: Subscription | undefined;
    private routeClickSub: Subscription | undefined;
    private loadTimeout: ReturnType<typeof setTimeout> | undefined;
    private lastRequestKey: string | undefined;

    // Canvas renderer: all polylines share a single <canvas>, ~5-10x faster than SVG for many shapes
    private readonly shapeRenderer = canvas({ padding: 0.5 });

    // Cache route-click results keyed by snapped grid cell to avoid redundant API calls
    private readonly routeCache = new Map<string, { html: string; ts: number }>();
    private readonly ROUTE_CACHE_TTL = 60_000;

    private shapes: GTFSShape[] = [];
    private stops: GTFSSearchStop[] = [];

    constructor(
        private readonly apiService: ApiService,
        private readonly titleService: Title,
        private readonly route: ActivatedRoute,
        private readonly location: Location,
    ) {
        this.titleService.setTitle('Map · Routes & Stops');
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
        if (isFinite(zoom)) {
            this.initialZoom = zoom;
            this.options = { ...this.options, zoom };
        }
    }

    ngOnDestroy(): void {
        this.dataSub?.unsubscribe();
        this.routeClickSub?.unsubscribe();
        if (this.loadTimeout) {
            clearTimeout(this.loadTimeout);
        }
    }

    onMapReady(map: LeafletMap): void {
        this.map = map;
        this.refreshMapSize();
        this.scheduleViewportLoad(true);
        
        map.on('zoomend', () => {
            this.updateUrl();
            this.loadRoutesAndStops();
            this.scheduleViewportLoad(false);
        });
        map.on('moveend', () => {
            this.updateUrl();
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
        this.loadTimeout = setTimeout(() => this.loadViewportData(), delayMs);
    }

    private loadViewportData(): void {
        if (!this.map) return;

        const zoom = this.map.getZoom();
        if (zoom < this.minShapeZoom) {
            // Cancel any in-flight request so it can't re-render after zoom-out
            this.dataSub?.unsubscribe();
            this.loading = false;
            this.shapes = [];
            this.stops = [];
            this.lastRequestKey = undefined;
            this.loadRoutesAndStops();
            return;
        }

        const bounds = this.map.getBounds();
        const shapeLimit = zoom <= 7 ? 100 : zoom <= 8 ? 200 : zoom <= 9 ? 350 : zoom <= 11 ? 550 : 900;
        const stopLimit = zoom < this.minStopZoom ? 0 : 7000;
        const requestKey = [
            zoom,
            bounds.getSouth().toFixed(4),
            bounds.getNorth().toFixed(4),
            bounds.getWest().toFixed(4),
            bounds.getEast().toFixed(4),
            shapeLimit,
            stopLimit,
            this.fullShapes,
        ].join('|');

        if (this.lastRequestKey === requestKey) {
            return;
        }
        this.lastRequestKey = requestKey;

        this.loading = true;
        this.dataSub?.unsubscribe();
        this.dataSub = this.apiService.GetMapViewportData(
            bounds.getSouth(),
            bounds.getNorth(),
            bounds.getWest(),
            bounds.getEast(),
            zoom,
            shapeLimit,
            stopLimit,
            this.fullShapes,
        ).subscribe({
            next: (data: MapViewportData) => {
                this.shapes = data?.shapes ?? [];
                this.stops = data?.stops ?? [];
                this.loading = false;
                this.lastUpdated = new Date();
                this.loadRoutesAndStops();
            },
            error: (err) => {
                this.error = err;
                this.loading = false;
            },
        });
    }

    private loadRoutesAndStops(): void {
        if (!this.map) return;

        const zoom = this.map.getZoom();

        if (zoom < this.minShapeZoom) {
            this.routeLineLayer.clearLayers();
            this.stopMarkerLayer.clearLayers();
            return;
        }

        this.displayRoutesAndStops(this.shapes, zoom >= this.minStopZoom ? this.stops : []);
    }

    private displayRoutesAndStops(shapes: GTFSShape[], stops: GTFSSearchStop[] = []): void {
        if (!this.map) return;

        this.routeLineLayer.clearLayers();
        this.stopMarkerLayer.clearLayers();

        // Group feed-level shapes by (dataOrigin + shape id) so they render as separate lines.
        const groupedByShapeId = new Map<string, GTFSShape[]>();
        for (const shape of shapes) {
            const key = `${shape.dataOrigin ?? ''}:${shape.id ?? '__unknown__'}`;
            const existing = groupedByShapeId.get(key) ?? [];
            existing.push(shape);
            groupedByShapeId.set(key, existing);
        }

        for (const [key, shapeGroup] of groupedByShapeId.entries()) {
            if (shapeGroup.length < 2) continue;
            shapeGroup.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
            const coordinates = shapeGroup.map((shape) => latLng(shape.latitude, shape.longitude));
            const shapeId = shapeGroup[0].id ?? '';
            const dataOrigin = shapeGroup[0].dataOrigin ?? '';
            const line = polyline(coordinates, {
                color: '#2563eb',
                weight: 4,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round',
                renderer: this.shapeRenderer,
            });
            line.on('click', (e: LeafletMouseEvent) => this.onShapeClick(e, line));
            this.routeLineLayer.addLayer(line);
        }

        // Display stops
        for (const stop of stops) {
            if (!stop.adjustedCoordinates || stop.adjustedCoordinates.length === 0) continue;
            const coord = stop.adjustedCoordinates[0];
            const stopLatLng = latLng(coord.latitude, coord.longitude);
            const marker = circle(stopLatLng, {
                radius: 100,
                color: '#ff6b6b',
                fillColor: '#ff6b6b',
                fillOpacity: 0.6,
                weight: 1,
            });

            const stopUrl = `/stops/${encodeURIComponent(stop.id)}/${stop.stopType}`;
            marker.bindPopup(`
                <strong>${stop.name}</strong><br/>
                <small>${stop.stopType}</small><br/>
                <a href="${stopUrl}" style="display:inline-block;margin-top:8px;padding:4px 10px;background:#0d6efd;color:#fff;border-radius:4px;text-decoration:none;font-size:0.85rem">View Departures</a>
            `);

            this.stopMarkerLayer.addLayer(marker);
        }
    }

    private onShapeClick(e: LeafletMouseEvent, line: ReturnType<typeof polyline>): void {
        // ~100 m grid cell for cache key
        const bbox = 0.001;
        const cacheKey = `${Math.round(e.latlng.lat / bbox)}:${Math.round(e.latlng.lng / bbox)}`;

        // Cancel any previous in-flight route lookup
        this.routeClickSub?.unsubscribe();

        // Serve from cache if fresh
        const cached = this.routeCache.get(cacheKey);
        if (cached && Date.now() - cached.ts < this.ROUTE_CACHE_TTL) {
            line.bindPopup(cached.html, { autoPan: false }).openPopup(e.latlng);
            return;
        }

        line.bindPopup('<em>Loading routes\u2026</em>', { autoPan: false }).openPopup(e.latlng);

        this.routeClickSub = this.apiService.GetRoutesNearPoint(e.latlng.lat, e.latlng.lng, bbox).subscribe({
            next: (routes) => {
                const html = this.buildRoutesPopupContent(routes);
                // Evict oldest entry if cache is large
                if (this.routeCache.size >= 100) {
                    const oldestKey = [...this.routeCache.entries()]
                        .sort((a, b) => a[1].ts - b[1].ts)[0][0];
                    this.routeCache.delete(oldestKey);
                }
                this.routeCache.set(cacheKey, { html, ts: Date.now() });
                line.setPopupContent(html);
            },
            error: () => {
                line.setPopupContent('Could not load route info.');
            },
        });
    }

    private buildRoutesPopupContent(routes: { id: string; shortName?: string; longName?: string; color?: string; textColor?: string; type?: number | string; dataOrigin: string }[]): string {
        if (routes.length === 0) {
            return '<strong>No routes found here.</strong>';
        }

        const groups = new Map<string, typeof routes>();
        for (const r of routes) {
            const label = gtfsTypeLabel(r.type);
            const existing = groups.get(label) ?? [];
            existing.push(r);
            groups.set(label, existing);
        }

        const sortedGroups = [...groups.entries()].sort(
            (a, b) => (GTFS_TYPE_ORDER as string[]).indexOf(a[0]) - (GTFS_TYPE_ORDER as string[]).indexOf(b[0])
        );

        const sections = sortedGroups.map(([label, groupRoutes]) => {
            const items = groupRoutes.map(r => {
                const color = r.color ? `#${r.color}` : '#2563eb';
                const displayName = r.shortName
                    ? `<span style="display:inline-block;min-width:2em;background:${color};color:#${r.textColor || 'fff'};border-radius:3px;padding:0 4px;text-align:center;font-weight:bold;font-size:0.8em">${r.shortName}</span>&nbsp;${r.longName ?? ''}`
                    : (r.longName ?? r.id);
                const href = `/routes/${encodeURIComponent(r.dataOrigin)}/${encodeURIComponent(r.id)}`;
                return `<li style="margin:3px 0"><a href="${href}" style="color:inherit;text-decoration:none" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${displayName}</a></li>`;
            }).join('');
            return `<div style="margin-top:6px"><strong style="font-size:0.8em;text-transform:uppercase;letter-spacing:0.04em;color:#666">${label}</strong><ul style="margin:2px 0 0;padding-left:14px">${items}</ul></div>`;
        }).join('');

        return `<div style="max-height:260px;overflow-y:auto;min-width:180px"><strong>Routes here:</strong>${sections}</div>`;
    }

    private refreshMapSize(): void {
        if (!this.map) {
            return;
        }

        this.map.invalidateSize();
        setTimeout(() => this.map?.invalidateSize(), 0);
        setTimeout(() => this.map?.invalidateSize(), 200);
    }

    private updateUrl(): void {
        if (!this.map) return;
        const c = this.map.getCenter();
        const z = this.map.getZoom();
        const url = this.location.prepareExternalUrl(
            `/map?lat=${c.lat.toFixed(5)}&lon=${c.lng.toFixed(5)}&zoom=${z}`,
        );
        this.location.replaceState(url);
    }
}
