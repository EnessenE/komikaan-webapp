import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { HttpErrorResponse } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { NgbCollapseModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

// Leaflet
import { FeatureGroup, Map, circle, featureGroup, latLng, tileLayer, Layer } from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

// Project Imports
import { ApiService } from '../../services/api.service';
import { GTFSStop } from '../../models/gtfsstop';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { LoadingComponent } from '../../comps/loading/loading.component';
import { ErrorComponent } from '../../comps/error/error.component';
import { RouteComponent } from '../../comps/route/route.component';
import { Alert } from '../../models/gtfsalert';

@Component({
    selector: 'app-departures',
    standalone: true,
    imports: [CommonModule, RouterLink, LeafletModule, NgbCollapseModule, NgbTooltipModule, TimeOnlySelectionComponent, TrackSelectionComponent, LoadingComponent, ErrorComponent, RouteComponent],
    templateUrl: './departures.component.html',
    styleUrls: ['./departures.component.scss'],
})
export class DeparturesComponent implements OnInit, OnDestroy {
    stop: GTFSStop | undefined;
    selectedStopId: string | undefined;
    selectedType: string | undefined;
    selectedDataOrigin: string | undefined;
    loading = false;
    error: HttpErrorResponse | undefined;

    alerts: Alert[] | undefined;
    alertFailure: HttpErrorResponse | undefined;
    alertsLoading: boolean = true; // <-- NEW: Add this property

    // UI States
    isSourcesCollapsed = true;
    isRoutesCollapsed = true;

    private routeSub: Subscription | undefined;

    // Map Config
    map!: Map;
    markerLayers: FeatureGroup = featureGroup();
    options = {
        zoom: 15,
        center: latLng(52.0907, 5.1214),
        zoomControl: false,
        attributionControl: false,
    };
    baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
    layers: Layer[] = [this.baseLayer, this.markerLayers];
    layersControl: LeafletControlLayersConfig = { baseLayers: {}, overlays: {} };

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.routeSub = this.route.params.subscribe((params) => {
            this.selectedStopId = params['id'];
            this.selectedType = params['type'];
            this.selectedDataOrigin = params['dataOrigin'];
            // Reset collapse states on navigation
            this.isSourcesCollapsed = true;
            this.isRoutesCollapsed = true;
            this.loadStopData();
        });
    }

    ngOnDestroy(): void {
        if (this.routeSub) this.routeSub.unsubscribe();
    }

    loadStopData(): void {
        this.loading = true;
        this.stop = undefined;
        this.error = undefined;

        const callback = {
            next: (data: GTFSStop) => {
                this.loading = false;
                this.stop = data;
                this.titleService.setTitle(this.stop.name || 'Stop Details');
                this.updateMapMarkers(this.stop.mergedStops && this.stop.mergedStops.length > 0 ? this.stop.mergedStops : [this.stop]);
                this.alertsLoading = true;
                this.apiService.GetAlerts(this.stop.primaryStop, this.stop.stopType).subscribe({
                    next: (alertsData) => {
                        this.alertsLoading = false;
                        this.alerts = alertsData;
                    },
                    error: (alertsError: any) => {
                        this.alertFailure = alertsError;
                        console.error('Error fetching alerts:', alertsError);
                    },
                });
            },
            error: (error: any) => {
                this.loading = false;
                this.error = error;
            },
        };

        if (this.selectedType != undefined && this.selectedStopId != undefined) {
            this.apiService.GetStop(this.selectedStopId, this.selectedType).subscribe(callback);
        } else if (this.selectedDataOrigin != undefined && this.selectedStopId != undefined) {
            this.apiService.GetExactStop(this.selectedDataOrigin, this.selectedStopId).subscribe(callback);
        } else {
            alert('No route type was select, but also no data origin was set for searching! Uh. Try again?');
        }
    }

    uniqueRoutes() {
        const seen = new Set<string>();
        return this.stop!.routes.filter((route) => {
            const key = route.shortName?.toLowerCase();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    // --- Map Logic ---
    updateMapMarkers(stops: GTFSStop[]): void {
        this.markerLayers.clearLayers();
        stops.forEach((s) => {
            if (s.latitude && s.longitude) {
                this.markerLayers.addLayer(circle([s.latitude, s.longitude], { radius: 30, color: '#3b82f6', fillOpacity: 0.5 }).bindPopup(`<strong>${s.name}</strong><br>${s.dataOrigin}`));
            }
        });
        setTimeout(() => {
            if (this.map && this.markerLayers.getLayers().length > 0) {
                this.map.fitBounds(this.markerLayers.getBounds(), { padding: [20, 20] });
            }
        }, 200);
    }

    onMapReady(map: Map): void {
        this.map = map;
        this.map.invalidateSize();
    }

    onResize(): void {
        this.map?.invalidateSize();
    }

    // --- UI Helpers ---

    getStopTypeIcon(type: string | undefined): string {
        const t = type?.toLowerCase() || '';
        if (t.includes('bus')) return 'bi-bus-front';
        if (t.includes('tram')) return 'bi-train-lightrail-front';
        if (t.includes('metro') || t.includes('subway')) return 'bi-train-subway-front';
        if (t.includes('rail') || t.includes('train')) return 'bi-train-front';
        if (t.includes('ferry') || t.includes('boat')) return 'bi-water';
        return 'bi-geo-alt';
    }

    getStopTypeColor(type: string | undefined): string {
        const t = type?.toLowerCase() || '';
        if (t.includes('bus')) return 'text-primary';
        if (t.includes('tram')) return 'text-success';
        if (t.includes('metro')) return 'text-warning';
        if (t.includes('rail')) return 'text-info';
        return 'text-secondary';
    }

    isNewDay(current: any, previous: any): boolean {
        if (!previous || !current.actualArrivalTime) return false;
        return new Date(current.actualArrivalTime).getDate() !== new Date(previous.actualArrivalTime).getDate();
    }

    /**
     * Determines the Bootstrap border class based on the alert's cause.
     */
    getAlertStripeClass(alert: Alert): string {
        switch (alert.cause?.toUpperCase()) {
            case 'STRIKE':
            case 'ACCIDENT':
            case 'MEDICAL_EMERGENCY':
                return 'border-left-danger';
            case 'CONSTRUCTION':
            case 'MAINTENANCE':
                return 'border-left-warning';
            case 'HOLIDAY':
                return 'border-left-info';
            default:
                return 'border-left-primary';
        }
    }

    /**
     * Determines the Bootstrap Icon class based on the alert's cause.
     */
    getAlertIcon(alert: Alert): string {
        switch (alert.cause?.toUpperCase()) {
            case 'STRIKE':
                return 'bi-megaphone-fill';
            case 'CONSTRUCTION':
            case 'MAINTENANCE':
                return 'bi-cone-striped';
            case 'ACCIDENT':
                return 'bi-car-front-fill';
            case 'HOLIDAY':
                return 'bi-calendar-event-fill';
            case 'MEDICAL_EMERGENCY':
                return 'bi-heart-pulse-fill';
            default:
                return 'bi-exclamation-triangle-fill';
        }
    }

    /**
     * NEW: Formats the activePeriods string into a human-readable format.
     * Assumes the string is a JSON array of objects with 'start' and 'end' properties.
     */
    formatActivePeriods(periods: string): string | null {
        if (!periods) return null;

        try {
            const parsedPeriods = JSON.parse(periods);
            if (!Array.isArray(parsedPeriods) || parsedPeriods.length === 0) {
                return null;
            }

            const period = parsedPeriods[0]; // Assuming we only show the first period for simplicity
            const start = new Date(period.start);
            const end = period.end ? new Date(period.end) : null;

            const options: Intl.DateTimeFormatOptions = {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            };

            if (end) {
                return `Active from ${start.toLocaleString(undefined, options)} to ${end.toLocaleString(undefined, options)}`;
            } else {
                return `Active from ${start.toLocaleString(undefined, options)}`;
            }
        } catch (e) {
            console.error('Error parsing activePeriods:', e);
            return null; // Don't show anything if the format is invalid
        }
    }
}
