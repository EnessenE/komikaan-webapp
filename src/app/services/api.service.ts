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
import { VehiclePosition } from '../models/vehicle-position';

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

    NearbyStops(location: { lat: number; lng: number }): Observable<Array<GTFSSearchStop>> {
        return this.http.get<Array<GTFSSearchStop>>(
            environment.apiServer + '/v1/stops/nearby?longitude=' + location.lng + '&latitude=' + location.lat,
        );
    }

    GetFeeds(): Observable<Array<Feed>> {
        return this.http.get<Array<Feed>>(environment.apiServer + '/v1/feeds');
    }

    GetFeedStops(feed: string): Observable<Array<GTFSSearchStop>> {
        return this.http.get<Array<GTFSSearchStop>>(environment.apiServer + '/v1/feeds/' + feed + '/stops');
    }

    GetFeedShapes(feed: string): Observable<Array<GTFSShape>> {
        return this.http.get<Array<GTFSShape>>(environment.apiServer + '/v1/feeds/' + feed + '/shapes');
    }

    GetFeedRoutes(feed: string): Observable<Array<GTFSRoute>> {
        return this.http.get<Array<GTFSRoute>>(environment.apiServer + '/v1/feeds/' + feed + '/routes');
    }

    GetFeedPositions(feed: string): Observable<Array<VehiclePosition>> {
        return this.http.get<Array<VehiclePosition>>(environment.apiServer + '/v1/feeds/' + feed + '/positions');
    }

    GetStop(stopId: string, stopType: string): Observable<GTFSStop> {
        return this.http.get<GTFSStop>(environment.apiServer + '/v1/stops/' + stopId + '/' + stopType);
    }

    GetTrip(trip: string): Observable<GTFSTrip> {
        return this.http.get<GTFSTrip>(environment.apiServer + '/v1/trips/' + trip);
    }

    GetPossibility(origin: string, destination: string): Observable<JourneyResult> {
        return this.http.get<JourneyResult>(environment.apiServer + '/v1/Disruption/' + origin + '/' + destination);
    }
}
