import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiBaseUrl } from './api-base';
import { CatalogResponse, VeloStation } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class VeloApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl();

  listStations() {
    return this.http.get<CatalogResponse<VeloStation[]>>(
      `${this.baseUrl}/velo/stations`,
    );
  }

  getStation(stationId: string) {
    return this.http.get<CatalogResponse<VeloStation>>(
      `${this.baseUrl}/velo/stations/${stationId}`,
    );
  }
}
