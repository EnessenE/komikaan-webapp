import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { JourneyResult } from '../models/journey-result';
import { SimplifiedStop } from '../models/simplified-stop';
import { GTFSStopTime } from '../models/gtfsstop-time';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  GetStops(text: string): Observable<Array<SimplifiedStop>> {
    if (!(text.length > 0)) {
      text = 'Amsterdam';
    }

    return this.http.get<Array<SimplifiedStop>>(
      environment.apiServer + '/v1/stops/search?filter=' + text
    );
  }

  GetStopDepartures(stopId: string): Observable<Array<GTFSStopTime>> {
    return this.http.get<Array<GTFSStopTime>>(
      environment.apiServer + '/v1/stops/' + stopId + '/trips'
    );
  }

  GetPossibility(origin: string, destination: string): Observable<JourneyResult> {
    return this.http.get<JourneyResult>(
      environment.apiServer + '/v1/Disruption/' + origin + '/' + destination
    );
  }
}
