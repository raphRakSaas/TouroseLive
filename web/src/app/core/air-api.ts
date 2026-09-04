import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AirIndex, CatalogResponse } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class AirApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

  getIndex() {
    return this.http.get<CatalogResponse<AirIndex | null>>(
      `${this.baseUrl}/air`,
    );
  }
}
