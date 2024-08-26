import { Component, OnInit } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { GTFSRoute } from '../../models/gtfsroute';
import { RouteComponent } from '../../comps/route/route.component';
import { LeafletControlLayersConfig, LeafletModule } from '@asymmetrik/ngx-leaflet';
import { FeatureGroup, Map, LatLngBounds, latLng, Layer, tileLayer, featureGroup, circle, Popup } from 'leaflet';
import { GTFSSearchStop } from '../../models/gtfssearchstop';

@Component({
    selector: 'app-feed-details',
    standalone: true,
    imports: [RouterLink, LeafletModule, RouteComponent],
    templateUrl: './feed-details.component.html',
    styleUrl: './feed-details.component.scss',
})
export class FeedDetailsComponent implements OnInit {
    loading: boolean = false;
    selectedFeed: string = 'Unknown';
    routes: GTFSRoute[] | undefined;
    stops: GTFSSearchStop[] | undefined;

    map!: Map;
    markerLayers!: FeatureGroup;

    layersControl: LeafletControlLayersConfig = {
        baseLayers: {},
        overlays: {},
    };

    mapFitToBounds!: LatLngBounds;

    options = {
        zoom: 13,
        center: latLng(52.0907, 5.1214),
    };

    layers: Layer[] = [
        tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 5,
        }),
    ];
    
    constructor(
        private apiService: ApiService,
        private route: ActivatedRoute,
        private titleService: Title,
    ) {}

    ngOnInit(): void {
        this.loading = true;
        this.route.params.subscribe((params) => {
            this.selectedFeed = params['id'];
            this.titleService.setTitle(this.selectedFeed);
            this.titleService.setTitle('Feed ' + this.selectedFeed);
            this.apiService.GetFeedRoutes(this.selectedFeed).subscribe({
                next: (data) => {
                    this.routes = data;
                    this.loading = false;
                },
            });
            this.apiService.GetFeedStops(this.selectedFeed).subscribe({
                next: (data) => {
                    this.stops = data;
                    this.addStopsToMap(data);
                    this.loading = false;
                },
            });
        });
    }

    
    addStopsToMap(stops: GTFSSearchStop[]) {
      this.layers = [
          tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
              maxZoom: 18,
          }),
      ];
      this.markerLayers.eachLayer((layer) => {
          this.markerLayers.removeLayer(layer);
      });
      stops.forEach((stop) => {
          stop.adjustedCoordinates.forEach((coordinate) => {
              var stopLayer = circle([coordinate.latitude, coordinate.longitude], { radius: 100 });

              var popup = new Popup();
              popup.setContent('<a href="/stops/' + stop.id + '/' + stop.stopType + '">' + stop.name + '</a>');

              stopLayer.bindPopup(popup);
              this.markerLayers.addLayer(stopLayer);
          });
      });
      this.layers.push(this.markerLayers);
      // Timeout due to timing bug on the initalization for an unknown reason.
      setTimeout(() => {
          console.log('Fitting bounds to markerLayers...');
          this.map.fitBounds(this.markerLayers.getBounds());
      }, 100);
      console.log('bounds');
      this.invalidateMap();
  }
    
    onMapReady(map: Map) {
        this.map = map;
        this.markerLayers = featureGroup();
        this.invalidateMap();
    }

    invalidateMap(): void {
        this.map?.invalidateSize();
    }
    onResize(event: any) {
        this.invalidateMap();
    }
}
