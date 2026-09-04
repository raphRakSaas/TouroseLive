import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CatalogResponse, Place, PlaceKind } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class PlacesApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

  listPlaces(kind: PlaceKind | 'all' = 'all') {
    const query = kind === 'all' ? '' : `?kind=${encodeURIComponent(kind)}`;
    return this.http.get<CatalogResponse<Place[]>>(
      `${this.baseUrl}/places${query}`,
    );
  }

  getPlace(placeId: string) {
    return this.http.get<CatalogResponse<Place>>(
      `${this.baseUrl}/places/${encodeURIComponent(placeId)}`,
    );
  }
}
