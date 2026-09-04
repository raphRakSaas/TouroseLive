import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiBaseUrl } from './api-base';
import { CatalogResponse, CultureEvent } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl();

  listEvents() {
    return this.http.get<CatalogResponse<CultureEvent[]>>(
      `${this.baseUrl}/events`,
    );
  }

  getEvent(eventId: string) {
    return this.http.get<CatalogResponse<CultureEvent>>(
      `${this.baseUrl}/events/${encodeURIComponent(eventId)}`,
    );
  }
}
