import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JourneyResult } from '../models/journey-result';
import { GTFSTrip } from '../models/gtfstrip';
import { GTFSStop } from '../models/gtfsstop';
import { GTFSSearchStop } from '../models/gtfssearchstop';
import { Feed } from '../models/feed';

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


    AllStops(): Observable<Array<GTFSSearchStop>> {
        return this.http.get<Array<GTFSSearchStop>>(
            environment.apiServer + '/v1/stops/all',
        );
    }

    GetFeeds(): Observable<Array<Feed>> {
        return this.http.get<Array<Feed>>(
            environment.apiServer + '/v1/feeds',
        );
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
