import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { CatalogResponse, TisseoAlert } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class TisseoApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = 'http://localhost:3000/v1';

  listAlerts() {
    return this.http.get<CatalogResponse<TisseoAlert[]>>(
      `${this.baseUrl}/tisseo/alerts`,
    );
  }
}
