import { Component } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { TimeOnlySelectionComponent } from '../../comps/time-only-selection/time-only-selection.component';
import { TrackSelectionComponent } from '../../comps/track-selection/track-selection.component';
import { GTFSTrip } from '../../models/gtfstrip';
import { ClipboardModule } from '@angular/cdk/clipboard';
import {
    FeatureGroup,
    Icon,
    LatLng,
    LatLngBounds,
    Layer,
    Map,
    Popup,
    circle,
    featureGroup,
    icon,
    latLng,
    marker,
    polyline,
    tileLayer,
} from 'leaflet';
import { Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { LeafletModule, LeafletControlLayersConfig } from '@bluehalo/ngx-leaflet';

@Component({
    selector: 'app-trip',
    imports: [TimeOnlySelectionComponent, TrackSelectionComponent, RouterLink, LeafletModule, ClipboardModule],
    templateUrl: './trip.component.html',
    styleUrl: './trip.component.scss',
})
export class TripComponent {
    trip: GTFSTrip | undefined;
    selectedTrip: string | undefined;
    loading: boolean = false;
    realTime: boolean | undefined = undefined;

    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.markerLayers = featureGroup();
        this.loadData();
    }

    map!: Map;
    markerLayers!: FeatureGroup;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    mapFitToBounds!: LatLngBounds;

    options = {
        zoom: 10,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {})];

    convertToDate(dateString: string): Date {
        return new Date(dateString);
    }

    refreshData() {
        this.loadData();
    }

    loadData() {
        this.trip = undefined;
        this.loading = true;
        var routeSub = this.route.params.subscribe((params) => {
            this.trip = undefined;
            this.selectedTrip = params['id'];
            this.titleService.setTitle('Seaching for ' + this.selectedTrip);
            this.apiService.GetTrip(params['id']).subscribe({
                next: (data) => {
                    this.loading = false;
                    this.trip = data;
                    if (this.trip.measurementTime) {
                        this.realTime = true;
                    } else {
                        this.realTime = false;
                    }
                    this.dataRetrieved();
                    if (this.trip.headsign) {
                        this.titleService.setTitle(this.trip.headsign);
                    } else {
                        this.titleService.setTitle(this.trip?.routeShortName + ' - ' + this.trip?.routeLongName);
                    }
                },
            });
        });
    }

    dataRetrieved() {
        const routeLine: LatLng[] = [];
    
        // Clear previous markers
        this.markerLayers.clearLayers();
    
        this.trip?.stops?.forEach((stop) => {
            const stopLayer = marker([stop.latitude, stop.longitude], {
                icon: icon({
                    ...Icon.Default.prototype.options,
                    iconUrl: 'assets/marker-icon.png',
                    iconRetinaUrl: 'assets/marker-icon-2x.png',
                    shadowUrl: 'assets/marker-shadow.png',
                }),
            });
    
            const popup = new Popup();
            popup.setContent(`<a href="/stops/${stop.id}/${stop.stopType}">${stop.name}</a>`);
            stopLayer.bindPopup(popup);
            this.markerLayers.addLayer(stopLayer);
    
            // If no shape data, fallback to stops for routing
            if (!(this.trip?.shapes?.length)) {
                if (stop.latitude != null && stop.longitude != null) {
                    routeLine.push(latLng(stop.latitude, stop.longitude));
                }
            }
        });
    
        this.trip?.shapes?.forEach((shape) => {
            if (shape.latitude != null && shape.longitude != null) {
                routeLine.push(latLng(shape.latitude, shape.longitude));
            }
        });
    
        this.markLiveLocation();
    
        const lineColor = 'green';
        const line = polyline(routeLine, { color: lineColor });
    
        // Add polyline to overlays and layers
        this.layersControl.overlays['Route Line'] = line;
        this.layers.push(line);
        this.layers.push(this.markerLayers);
    
        this.invalidateMap(); // ensure map is valid and updated
    
        // Delay fitBounds to ensure map is ready
        setTimeout(() => {
            if (this.map && this.markerLayers.getLayers().length > 0) {
                const bounds = this.markerLayers.getBounds();
                this.map.fitBounds(bounds, { padding: [20, 20] });
                console.log('Fitting bounds to markerLayers...');
            } else {
                console.warn('Map or markerLayers not ready for fitBounds');
            }
        }, 100);
    }
    

    markLiveLocation() {
        if (this.trip?.latitude && this.trip.longitude) {
            var positionLayer = circle([this.trip.latitude, this.trip.longitude], { radius: 5, color: 'red' });
            this.markerLayers.addLayer(positionLayer);
            var positionLayer = circle([this.trip.latitude, this.trip.longitude], { radius: 100, color: 'blue' });

            if (this.trip.targetStopName) {
                var popup = new Popup();
                popup.setContent(
                    'Currently going towards <a href="/stops/' +
                        this.trip.targetStopId +
                        '/' +
                        this.trip.targetStopType +
                        '">' +
                        this.trip.targetStopName +
                        '</a>',
                );
                positionLayer.bindPopup(popup);
            }
            this.markerLayers.addLayer(positionLayer);
        }
    }

    onMapReady(map: Map) {
        this.map = map;
        this.invalidateMap();
    }

    invalidateMap(): void {
        this.map?.invalidateSize();
    }

    onResize(event: any) {
        this.invalidateMap();
    }
}
