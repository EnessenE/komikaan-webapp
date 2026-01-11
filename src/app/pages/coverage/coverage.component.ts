import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import L from 'leaflet';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { LeafletModule } from '@bluehalo/ngx-leaflet';
import { ErrorComponent } from '../../comps/error/error.component';
import { CoverageData } from '../../models/coverage-data';

@Component({
  selector: 'app-coverage',
  standalone: true,
  imports: [CommonModule, LeafletModule, ErrorComponent, RouterModule],
  templateUrl: './coverage.component.html',
  styleUrls: ['./coverage.component.scss']
})
export class CoverageComponent implements OnInit, OnDestroy {
  public options: L.MapOptions = {
    layers: [
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      })
    ],
    zoom: 5,
    center: L.latLng(48.2082, 16.3738)
  };

  public error?: HttpErrorResponse;
  public loading = true;
  public map?: L.Map;

  public dataOrigins: string[] = [];
  public stopTypes: string[] = [];
  
  public autoFitMap = true;

  private coverageLayers: { [key: string]: L.Polygon } = {};
  private comboColorMap: { [key: string]: string } = {};
  
  private selectedOrigins = new Set<string>();
  private selectedStopTypes = new Set<string>();
  private queryParamsSubscription?: Subscription;

  private allDataOrigins: string[] = [];
  private allStopTypes: string[] = [];
  private originToStopTypesMap = new Map<string, Set<string>>();
  private stopTypeToOriginsMap = new Map<string, Set<string>>();

  constructor(
    private apiService: ApiService,
    private router: Router,
    private activatedRoute: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.fetchCoverageData();
  }

  ngOnDestroy(): void {
    this.queryParamsSubscription?.unsubscribe();
  }

  public onMapReady(map: L.Map): void {
    this.map = map;
    if (!this.loading) {
      this.refreshMapView();
    }
  }

  private fetchCoverageData(): void {
    this.loading = true;
    this.apiService.GetCoverage().subscribe({
      next: (data) => {
        this.processCoverageData(data);
        this.listenToQueryParams();
        this.loading = false;
      },
      error: (err) => {
        this.error = err;
        this.loading = false;
      }
    });
  }
  
  private listenToQueryParams(): void {
    this.queryParamsSubscription = this.activatedRoute.queryParams.subscribe(params => {
      const originsFromUrl = params['dataOrigin'] ? params['dataOrigin'].split(',') : [];
      const stopTypesFromUrl = params['stopType'] ? params['stopType'].split(',') : [];

      this.selectedOrigins = new Set(originsFromUrl);
      this.selectedStopTypes = new Set(stopTypesFromUrl);
      
      this.applyFilters();
      this.updateAvailableFilterOptions();

      // This call is now confirmed to work consistently for both filters.
      this.refreshMapView();
    });
  }

  private processCoverageData(data: CoverageData[]): void {
    const coverageGroups: { [key: string]: L.LatLngExpression[] } = {};
    const origins = new Set<string>();
    const types = new Set<string>();
    for (const point of data) {
      const { dataOrigin, stopType, clusterId } = point;
      const key = `${dataOrigin}_${stopType}_${clusterId}`;
      if (!coverageGroups[key]) {
        coverageGroups[key] = [];
      }
      coverageGroups[key].push([point.latitude, point.longitude]);
      origins.add(dataOrigin);
      if (stopType) types.add(stopType);
      if (!this.originToStopTypesMap.has(dataOrigin)) {
        this.originToStopTypesMap.set(dataOrigin, new Set());
      }
      this.originToStopTypesMap.get(dataOrigin)!.add(stopType);
      if (!this.stopTypeToOriginsMap.has(stopType)) {
        this.stopTypeToOriginsMap.set(stopType, new Set());
      }
      this.stopTypeToOriginsMap.get(stopType)!.add(dataOrigin);
    }
    this.allDataOrigins = [...origins].sort();
    this.allStopTypes = [...types].sort();
    this.drawPolygons(coverageGroups);
  }

  private drawPolygons(groups: { [key: string]: L.LatLngExpression[] }): void {
    if (!this.map) return;
    Object.values(this.coverageLayers).forEach(layer => layer.remove());
    this.coverageLayers = {};
    for (const key in groups) {
      const points = groups[key];
      const [origin, stopType] = key.split('_'); 
      const polygon = L.polygon(points, { 
        color: this.getColorForCombination(origin, stopType),
        weight: 2,
        opacity: 0.8,
        fillOpacity: 0.3
      }).bindPopup(`<b>Origin:</b> ${origin}<br><b>Type:</b> ${stopType || 'N/A'}`);
      this.coverageLayers[key] = polygon;
    }
  }
  
  private applyFilters(): void {
    if (!this.map) return;
    Object.values(this.coverageLayers).forEach(layer => layer.remove());
    for (const key in this.coverageLayers) {
      const [origin, stopType] = key.split('_'); 
      const originMatch = this.selectedOrigins.size === 0 || this.selectedOrigins.has(origin);
      const stopTypeMatch = this.selectedStopTypes.size === 0 || this.selectedStopTypes.has(stopType);
      if (originMatch && stopTypeMatch) {
        this.coverageLayers[key].addTo(this.map);
      }
    }
  }

  private updateAvailableFilterOptions(): void {
    let availableOrigins = new Set(this.allDataOrigins);
    let availableStopTypes = new Set(this.allStopTypes);
    if (this.selectedStopTypes.size > 0) {
      const relevantOrigins = new Set<string>();
      this.selectedStopTypes.forEach(type => {
        this.stopTypeToOriginsMap.get(type)?.forEach(origin => relevantOrigins.add(origin));
      });
      availableOrigins = relevantOrigins;
    }
    if (this.selectedOrigins.size > 0) {
      const relevantStopTypes = new Set<string>();
      this.selectedOrigins.forEach(origin => {
        this.originToStopTypesMap.get(origin)?.forEach(type => relevantStopTypes.add(type));
      });
      availableStopTypes = relevantStopTypes;
    }
    this.dataOrigins = [...availableOrigins].sort();
    this.stopTypes = [...availableStopTypes].sort();
  }

  private updateUrl(): void {
    const queryParams: { [key: string]: string | null } = {
      dataOrigin: this.selectedOrigins.size > 0 ? [...this.selectedOrigins].join(',') : null,
      stopType: this.selectedStopTypes.size > 0 ? [...this.selectedStopTypes].join(',') : null
    };
    this.router.navigate([], {
      relativeTo: this.activatedRoute,
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true
    });
  }

  // --- Template Methods ---

  public toggleOrigin(origin: string): void {
    this.selectedOrigins.has(origin) ? this.selectedOrigins.delete(origin) : this.selectedOrigins.add(origin);
    this.updateUrl();
  }

  public isOriginSelected(origin: string): boolean {
    return this.selectedOrigins.has(origin);
  }

  public toggleStopType(stopType: string): void {
    this.selectedStopTypes.has(stopType) ? this.selectedStopTypes.delete(stopType) : this.selectedStopTypes.add(stopType);
    this.updateUrl();
  }

  public isStopTypeSelected(stopType: string): boolean {
    return this.selectedStopTypes.has(stopType);
  }

  public toggleAutoFit(): void {
    this.autoFitMap = !this.autoFitMap;
    if (this.autoFitMap) {
      this.refreshMapView();
    }
  }

  // --- Utility Methods ---

  private refreshMapView(): void {
    if (!this.map) {
      return;
    }

    setTimeout(() => {
      this.map!.invalidateSize();

      if (!this.autoFitMap) {
        return;
      }

      const visiblePolygons = Object.values(this.coverageLayers).filter(layer => this.map!.hasLayer(layer));

      if (visiblePolygons.length > 0) {
        const featureGroup = L.featureGroup(visiblePolygons);
        this.map!.fitBounds(featureGroup.getBounds(), { padding: [50, 50] });
      }
    }, 0);
  }

  private getColorForCombination(origin: string, stopType: string): string {
    const key = `${origin}_${stopType}`;
    if (this.comboColorMap[key]) return this.comboColorMap[key];
    
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = key.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    let color = '#';
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xFF;
      color += ('00' + value.toString(16)).substr(-2);
    }
    
    this.comboColorMap[key] = color;
    return color;
  }
}