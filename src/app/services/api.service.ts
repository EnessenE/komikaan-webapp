import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JourneyResult } from '../models/journey-result';
import { GTFSTrip } from '../models/gtfstrip';
import { GTFSStop } from '../models/gtfsstop';
import { GTFSSearchStop } from '../models/gtfssearchstop';
import { Feed } from '../models/feed';
import { GTFSShape } from '../models/gtfsshape';
import { GTFSRoute } from '../models/gtfsroute';
import { GTFSRouteDetails } from '../models/gtfsroute-details';
import { GTFSRouteTimetableRow } from '../models/gtfsroute-timetable-row';
import { VehiclePosition } from '../models/vehicle-position';
import { NearbyData } from '../models/nearby-data';
import { Alert } from '../models/gtfsalert';
import { GTFSAgency } from '../models/gtfsagency';
import { CoverageData } from '../models/coverage-data';
import { TopDelayedStop } from '../models/top-delayed-stop';
import { TrainStationPerformance } from '../models/train-station-performance';
import { MapViewportData } from '../models/map-viewport-data';

@Injectable({
    providedIn: 'root',
})
export class ApiService {
    constructor(private http: HttpClient) {}

    GetStops(text: string): Observable<Array<GTFSSearchStop>> {
        if (!(text.length > 0)) {
            text = 'Amsterdam';
        }

        return this.http.get<Array<GTFSSearchStop>>(environment.apiServer + '/v1/stops/search?filter=' + text);
    }

    NearbyStops(location: { lat: number; lng: number }): Observable<NearbyData> {
        return this.http.get<NearbyData>(environment.apiServer + '/v1/stops/nearby?longitude=' + location.lng + '&latitude=' + location.lat);
    }

    GetFeeds(): Observable<Array<Feed>> {
        return this.http.get<Array<Feed>>(environment.apiServer + '/v1/feeds');
    }

    GetFeedNames(): Observable<Array<string>> {
        return this.http.get<Array<string>>(environment.apiServer + '/v1/feeds/names');
    }

    GetRealtimeFeedNames(): Observable<Array<string>> {
        return this.http.get<Array<string>>(environment.apiServer + '/v1/feeds/realtime-names');
    }

    GetFeedStops(feed: string): Observable<Array<GTFSSearchStop>> {
        return this.http.get<Array<GTFSSearchStop>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/stops');
    }

    GetFeedShapes(feed: string): Observable<Array<GTFSShape>> {
        return this.http.get<Array<GTFSShape>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/shapes');
    }

    GetFeedRoutes(feed: string): Observable<Array<GTFSRoute>> {
        return this.http.get<Array<GTFSRoute>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/routes');
    }

    GetAgencies(feed: string): Observable<Array<GTFSAgency>> {
        return this.http.get<Array<GTFSAgency>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/agencies');
    }

    // Add this new method for alerts
    GetFeedAlerts(feed: string): Observable<Array<Alert>> {
        return this.http.get<Array<Alert>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/alerts');
    }

    GetFeedAlertsWithPagination(feed: string, limit?: number, offset?: number): Observable<Array<Alert>> {
        let url = environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/alerts';
        const params: string[] = [];
        
        if (limit !== undefined) {
            params.push('limit=' + limit);
        }
        if (offset !== undefined) {
            params.push('offset=' + offset);
        }
        
        if (params.length > 0) {
            url += '?' + params.join('&');
        }
        
        return this.http.get<Array<Alert>>(url);
    }

    GetTopDelayedStops(limit = 25, dataOrigin?: string): Observable<Array<TopDelayedStop>> {
        let url = environment.apiServer + '/v1/feeds/delays/top?limit=' + limit;
        if (dataOrigin) {
            url += '&dataOrigin=' + encodeURIComponent(dataOrigin);
        }
        return this.http.get<Array<TopDelayedStop>>(url);
    }

    GetTrainStationPerformance(
        minLatitude?: number,
        maxLatitude?: number,
        minLongitude?: number,
        maxLongitude?: number,
        limit = 800,
    ): Observable<Array<TrainStationPerformance>> {
        let url = environment.apiServer + '/v1/stops/train-stations';
        if (
            minLatitude !== undefined
            && maxLatitude !== undefined
            && minLongitude !== undefined
            && maxLongitude !== undefined
        ) {
            url += '?minLatitude=' + minLatitude
                + '&maxLatitude=' + maxLatitude
                + '&minLongitude=' + minLongitude
                + '&maxLongitude=' + maxLongitude
                + '&limit=' + limit;
        }

        return this.http.get<Array<TrainStationPerformance>>(url);
    }

    GetRoutesByShape(dataOrigin: string, shapeId: string): Observable<Array<GTFSRoute>> {
        return this.http.get<Array<GTFSRoute>>(
            environment.apiServer
            + '/v1/map/shape-routes?dataOrigin=' + encodeURIComponent(dataOrigin)
            + '&shapeId=' + encodeURIComponent(shapeId),
        );
    }

    GetRoutesNearPoint(latitude: number, longitude: number, bboxDegrees: number): Observable<Array<GTFSRoute>> {
        return this.http.get<Array<GTFSRoute>>(
            environment.apiServer
            + '/v1/map/routes-near-point?latitude=' + latitude
            + '&longitude=' + longitude
            + '&bboxDegrees=' + bboxDegrees,
        );
    }

    GetMapViewportData(
        minLatitude: number,
        maxLatitude: number,
        minLongitude: number,
        maxLongitude: number,
        zoom: number,
        shapeLimit = 200,
        stopLimit = 5000,
        fullShapes = false,
    ): Observable<MapViewportData> {
        return this.http.get<MapViewportData>(
            environment.apiServer
            + '/v1/map/viewport?minLatitude=' + minLatitude
            + '&maxLatitude=' + maxLatitude
            + '&minLongitude=' + minLongitude
            + '&maxLongitude=' + maxLongitude
            + '&zoom=' + zoom
            + '&shapeLimit=' + shapeLimit
            + '&stopLimit=' + stopLimit
            + '&fullShapes=' + fullShapes,
        );
    }

    GetFeedPositions(feed: string): Observable<Array<VehiclePosition>> {
        return this.http.get<Array<VehiclePosition>>(environment.apiServer + '/v1/feeds/' + encodeURIComponent(feed) + '/positions');
    }

    GetStop(stopId: string, stopType: string): Observable<GTFSStop> {
        return this.http.get<GTFSStop>(environment.apiServer + '/v1/stops/' + stopId + '/' + stopType);
    }

    GetAlerts(stopId: string, stopType: string): Observable<Array<Alert>> {
        return this.http.get<Array<Alert>>(environment.apiServer + '/v1/stops/' + stopId + '/' + stopType + '/alerts');
    }

    GetExactStop(dataOrigin: string, stopId: string): Observable<GTFSStop> {
        return this.http.get<GTFSStop>(environment.apiServer + '/v1/stops/exact/' + dataOrigin + '/' + stopId);
    }

    GetTrip(trip: string): Observable<GTFSTrip> {
        return this.http.get<GTFSTrip>(environment.apiServer + '/v1/trips/' + trip);
    }

    GetRoute(dataOrigin: string, routeId: string): Observable<GTFSRouteDetails> {
        return this.http.get<GTFSRouteDetails>(environment.apiServer + '/v1/routes/' + encodeURIComponent(dataOrigin) + '/' + encodeURIComponent(routeId));
    }

    GetTimetable(dataOrigin: string, routeId: string, date: string): Observable<GTFSRouteTimetableRow[]> {
        return this.http.get<GTFSRouteTimetableRow[]>(
            environment.apiServer + '/v1/routes/' + encodeURIComponent(dataOrigin) + '/' + encodeURIComponent(routeId) + '/timetable?date=' + encodeURIComponent(date),
        );
    }

    GetCoverage(): Observable<Array<CoverageData>> {
        return this.http.get<Array<CoverageData>>(environment.apiServer + '/v1/feeds/coverage');
    }
}
