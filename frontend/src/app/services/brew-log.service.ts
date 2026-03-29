import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { BrewLog, BrewLogPayload } from '../models/brew-log.models';

const API_BASE = '/api/v1/coffees';

@Injectable({ providedIn: 'root' })
export class BrewLogService {
  private readonly http = inject(HttpClient);

  getLogs(coffeeId: string): Observable<{ data: BrewLog[] }> {
    return this.http.get<{ data: BrewLog[] }>(`${API_BASE}/${coffeeId}/logs`);
  }

  addLog(coffeeId: string, payload: BrewLogPayload): Observable<{ data: BrewLog }> {
    return this.http.post<{ data: BrewLog }>(`${API_BASE}/${coffeeId}/logs`, payload);
  }

  deleteLog(coffeeId: string, logId: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/${coffeeId}/logs/${logId}`);
  }
}
