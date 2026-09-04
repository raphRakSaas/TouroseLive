import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CatalogResponse, CultureEvent } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class EventsApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

  listEvents() {
    return this.http.get<CatalogResponse<CultureEvent[]>>(
      `${this.baseUrl}/events`,
    );
  }
}
