import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CatalogResponse, ParkingLot } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class ParkingApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

  listLots() {
    return this.http.get<CatalogResponse<ParkingLot[]>>(`${this.baseUrl}/parkings`);
  }

  getLot(parkingId: string) {
    return this.http.get<CatalogResponse<ParkingLot>>(
      `${this.baseUrl}/parkings/${encodeURIComponent(parkingId)}`,
    );
  }
}
