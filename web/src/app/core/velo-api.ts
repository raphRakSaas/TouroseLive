import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CatalogResponse, VeloStation } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class VeloApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

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
