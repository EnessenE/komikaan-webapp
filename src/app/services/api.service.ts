import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  constructor(private http: HttpClient) {}

  GetStops(text: string): Observable<Array<string>> {
    if (!(text.length > 0)) {
      text = "Amsterdam"
    }

      return this.http.get<Array<string>>(
        environment.apiServer + '/stops/search?filter=' + text
      );
    
  }
}
