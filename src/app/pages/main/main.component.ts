import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common'; // Import CommonModule for pipes/directives
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject, Subscription } from 'rxjs';
import { debounceTime } from 'rxjs/operators';

// Leaflet
import {
  circle,
  featureGroup,
  icon,
  latLng,
  marker,
  tileLayer,
  FeatureGroup,
  Icon,
  LatLngBounds,
  Layer,
  Map,
  Popup,
  LeafletMouseEvent
} from 'leaflet';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';
import { NgbAccordionModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

// Project Imports
import { ApiService } from '../../services/api.service';
import { ErrorComponent } from '../../comps/error/error.component';
import { StopComponent } from '../../comps/stop/stop.component';
import { GTFSStop } from '../../models/gtfsstop';
import { GTFSSearchStop } from '../../models/gtfssearchstop';
import { NearbyData } from '../../models/nearby-data';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    LeafletModule,
    NgbTooltipModule,
    NgbAccordionModule,
    ErrorComponent,
    StopComponent
  ],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit, OnDestroy {
  // State
  originStop: GTFSStop | undefined;
  foundStops: GTFSSearchStop[] | undefined;
  loading = false;
  gettingLocation = false;
  error: HttpErrorResponse | undefined;
  location: { lat: number; lng: number } | undefined;

  // Search
  private searchInputSubject = new Subject<string>();
  private searchSubscription!: Subscription;

  // Map Configuration
  map!: Map;
  markerLayers: FeatureGroup = featureGroup();
  mapFitToBounds!: LatLngBounds;
  
  layersControl: LeafletControlLayersConfig = {
    baseLayers: {},
    overlays: {},
  };

  options = {
    zoom: 13,
    center: latLng(52.0907, 5.1214), // Utrecht Center
    zoomControl: false // We can add this manually for better positioning if needed
  };

  baseLayer = tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  });

  layers: Layer[] = [this.baseLayer, this.markerLayers];

  constructor(private apiService: ApiService) {}

  ngOnInit(): void {
    // Search Debounce Logic
    this.searchSubscription = this.searchInputSubject
      .pipe(debounceTime(500))
      .subscribe((searchText) => this.performSearch(searchText));
    
    // Fix map rendering issues on init
    setTimeout(() => this.invalidateMap(), 100);
  }

  ngOnDestroy(): void {
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  // --- Map Events ---

  onMapReady(map: Map): void {
    this.map = map;
    this.invalidateMap();
  }

  invalidateMap(): void {
    this.map?.invalidateSize();
  }

  onResize(): void {
    this.invalidateMap();
  }

  // --- Search Logic ---

  onSearchInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchInputSubject.next(input.value);
  }

  private performSearch(searchText: string): void {
    if (!searchText.trim()) {
      this.foundStops = [];
      return;
    }

    this.loading = true;
    this.foundStops = [];

    this.apiService.GetStops(searchText).subscribe({
      next: (data) => {
        this.loading = false;
        this.foundStops = data;
        this.updateMapMarkers(data, []); // Clear vehicles on manual search
      },
      error: (err) => this.handleError(err),
    });
  }

  // --- Geolocation Logic ---

  getNearbyStops(): void {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      return;
    }

    this.gettingLocation = true;
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.gettingLocation = false;
        this.location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        this.fetchNearbyData(this.location);
      },
      (err) => {
        this.gettingLocation = false;
        console.error(err);
        // Optional: Set a user-friendly error message here
      }
    );
  }

  private fetchNearbyData(location: { lat: number; lng: number }): void {
    this.loading = true;
    this.apiService.NearbyStops(location).subscribe({
      next: (data) => {
        this.loading = false;
        this.foundStops = data.stops;
        this.updateMapMarkers(data.stops, data.vehicles);
      },
      error: (err) => this.handleError(err),
    });
  }

  // --- Map Marker Logic ---

  /**
   * Centralized method to clear old markers and add new ones (stops and vehicles)
   */
  private updateMapMarkers(stops: GTFSSearchStop[], vehicles: any[] = []): void {
    this.markerLayers.clearLayers();

    // 1. Add Stops
    stops.forEach((stop) => {
      stop.adjustedCoordinates.forEach((coord) => {
        const stopCircle = circle([coord.latitude, coord.longitude], {
          radius: 80,
          color: '#3b82f6', // Modern blue
          fillColor: '#3b82f6',
          fillOpacity: 0.2
        });

        const popupContent = `<div class="map-popup">
            <strong>${stop.name}</strong><br>
            <a href="/stops/${stop.id}/${stop.stopType}" class="btn-link">View Departures</a>
        </div>`;
        
        stopCircle.bindPopup(popupContent);
        this.markerLayers.addLayer(stopCircle);
      });
    });

    // 2. Add Vehicles (if any)
    vehicles.forEach((vehicle) => {
      const vehicleCircle = circle([vehicle.latitude, vehicle.longitude], {
        radius: 50,
        color: '#10b981', // Emerald green
        fillColor: '#10b981',
        fillOpacity: 0.4
      });

      let popupText = `<strong>Vehicle: ${vehicle.id}</strong><br>Seen: ${vehicle.measurementTime}<br>`;
      popupText += vehicle.tripId
        ? `<a href="/trip/${vehicle.tripId}">View Trip ${vehicle.tripId}</a>`
        : `<span>No trip configured</span>`;

      vehicleCircle.bindPopup(popupText);
      this.markerLayers.addLayer(vehicleCircle);
    });

    // 3. Add Current Location Marker
    if (this.location) {
      const locMarker = marker([this.location.lat, this.location.lng], {
        icon: icon({
          ...Icon.Default.prototype.options,
          iconUrl: 'assets/marker-icon.png',
          iconRetinaUrl: 'assets/marker-icon-2x.png',
          shadowUrl: 'assets/marker-shadow.png',
        }),
      });
      locMarker.bindPopup('You are here');
      this.markerLayers.addLayer(locMarker);
    }

    // 4. Fit Bounds
    if (this.markerLayers.getLayers().length > 0) {
      setTimeout(() => {
        this.map.fitBounds(this.markerLayers.getBounds(), { padding: [50, 50] });
      }, 100);
    }
  }

  private handleError(error: HttpErrorResponse): void {
    this.loading = false;
    this.error = error;
    console.error(error);
  }
}