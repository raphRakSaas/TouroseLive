import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiBaseUrl } from './api-base';
import { CatalogResponse, AirIndex } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class AirApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl();

  getIndex() {
    return this.http.get<CatalogResponse<AirIndex | null>>(`${this.baseUrl}/air`);
  }
}
