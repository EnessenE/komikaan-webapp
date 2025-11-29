import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { Subscription } from 'rxjs';

// Leaflet
import {
  FeatureGroup,
  Icon,
  LatLng,
  Layer,
  Map,
  circle,
  featureGroup,
  icon,
  latLng,
  marker,
  polyline,
  tileLayer,
} from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

// Project Imports
import { ApiService } from '../../services/api.service';
import { GTFSTrip, GTFSTripStop } from '../../models/gtfstrip';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { LoadingComponent } from '../../comps/loading/loading.component';

@Component({
  selector: 'app-trip',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LeafletModule,
    ClipboardModule,
    TimeOnlySelectionComponent,
    TrackSelectionComponent,
    LoadingComponent
  ],
  templateUrl: './trip.component.html',
  styleUrls: ['./trip.component.scss'],
})
export class TripComponent implements OnInit, OnDestroy {
  trip: GTFSTrip | undefined;
  loading: boolean = false;
  realTime: boolean | undefined = undefined;
  showDetails = false;

  private routeSub: Subscription | undefined;

  // Map Config
  map: Map | undefined;
  markerLayers: FeatureGroup = featureGroup();
  routeLineLayer: FeatureGroup = featureGroup();
  
  options = {
    zoom: 12,
    center: latLng(52.0907, 5.1214),
    zoomControl: true,
    attributionControl: false
  };

  baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png');
  layers: Layer[] = [this.baseLayer, this.routeLineLayer, this.markerLayers];
  
  layersControl: LeafletControlLayersConfig = {
    baseLayers: {},
    overlays: {
      'Stops & Vehicle': this.markerLayers,
      'Route Line': this.routeLineLayer
    },
  };

  constructor(
    private apiService: ApiService,
    private route: ActivatedRoute,
    private titleService: Title,
  ) {}

  ngOnInit(): void {
    this.routeSub = this.route.params.subscribe((params) => {
      this.loadData(params['id']);
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) this.routeSub.unsubscribe();
  }

  refreshData() {
    if (this.trip?.id) {
      this.loadData(this.trip.id);
    }
  }

  loadData(tripId: string) {
    this.trip = undefined;
    this.loading = true;
    
    // Clear layers immediately
    this.markerLayers.clearLayers();
    this.routeLineLayer.clearLayers();

    this.titleService.setTitle('Loading Trip...');

    this.apiService.GetTrip(tripId).subscribe({
      next: (data) => {
        this.loading = false;
        this.trip = data;
        this.realTime = !!this.trip.measurementTime;

        const title = this.trip.headsign 
          ? `${this.trip.routeShortName} to ${this.trip.headsign}`
          : `Trip ${this.trip.routeShortName}`;
        this.titleService.setTitle(title);

        // Draw data on map
        this.drawMapFeatures();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  drawMapFeatures() {
    const routePoints: LatLng[] = [];

    // 1. Stops
    if (this.trip?.stops) {
      this.trip.stops.forEach((stop) => {
        if (stop.latitude && stop.longitude) {
          if (!this.trip?.shapes?.length) {
            routePoints.push(latLng(stop.latitude, stop.longitude));
          }

          const stopMarker = marker([stop.latitude, stop.longitude], {
            icon: icon({
              iconUrl: 'assets/marker-icon.png',
              shadowUrl: 'assets/marker-shadow.png',
              iconSize: [25, 41],
              iconAnchor: [12, 41],
              popupAnchor: [1, -34],
            }),
          });

          stopMarker.bindPopup(`
            <strong>${stop.name}</strong><br>
            <a href="/stops/${stop.id}/${stop.stopType}">View Stop</a>
          `);
          
          this.markerLayers.addLayer(stopMarker);
        }
      });
    }

    // 2. Route Line
    if (this.trip?.shapes?.length) {
      this.trip.shapes.forEach(s => {
        if (s.latitude && s.longitude) {
          routePoints.push(latLng(s.latitude, s.longitude));
        }
      });
    }

    if (routePoints.length > 0) {
      const line = polyline(routePoints, { color: '#3b82f6', weight: 4, opacity: 0.8 });
      this.routeLineLayer.addLayer(line);
    }

    // 3. Vehicle Position
    if (this.trip?.latitude && this.trip?.longitude) {
      const pulse = circle([this.trip.latitude, this.trip.longitude], { 
        radius: 100, color: '#10b981', fillOpacity: 0.2, stroke: false 
      });
      const vehicle = circle([this.trip.latitude, this.trip.longitude], { 
        radius: 15, color: '#10b981', fillOpacity: 1 
      });

      if (this.trip.targetStopName) {
        vehicle.bindPopup(`Heading to: ${this.trip.targetStopName}`);
      }
      this.markerLayers.addLayer(pulse);
      this.markerLayers.addLayer(vehicle);
    }

    // Update bounds
    this.updateMapBounds();
  }

  /**
   * Leaflet init hook.
   * Invalidating size here ensures the map renders tiles correctly
   * based on the final container dimensions.
   */
  onMapReady(map: Map) {
    this.map = map;
    
    // Slight delay to allow DOM layout to settle (Flexbox/Grid calculations)
    setTimeout(() => {
      this.map?.invalidateSize();
      this.updateMapBounds();
    }, 200);
  }

  updateMapBounds() {
    if (!this.map) return;
    
    const hasLayers = this.markerLayers.getLayers().length > 0 || this.routeLineLayer.getLayers().length > 0;
    
    if (hasLayers) {
      const group = featureGroup([this.markerLayers, this.routeLineLayer]);
      const bounds = group.getBounds();
      
      if (bounds.isValid()) {
        this.map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  onResize() {
    this.map?.invalidateSize();
  }

  isStopPassed(stop: GTFSTripStop): boolean {
    const timeVal = stop.actualDepartureTime || stop.plannedDepartureTime;
    if (!timeVal) return false;
    const stopDate = new Date(timeVal);
    const now = new Date();
    return stopDate.getTime() < (now.getTime() - 120000);
  }
}