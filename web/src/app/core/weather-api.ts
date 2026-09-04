import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiBaseUrl } from './api-base';
import {
  CatalogResponse,
  District,
  WeatherForecast,
} from './catalog.models';

@Injectable({ providedIn: 'root' })
export class WeatherApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl();

  listDistricts() {
    return this.http.get<CatalogResponse<District[]>>(
      `${this.baseUrl}/weather/districts`,
    );
  }

  getForecast(districtId?: string) {
    const query = districtId
      ? `?districtId=${encodeURIComponent(districtId)}`
      : '';
    return this.http.get<CatalogResponse<WeatherForecast>>(
      `${this.baseUrl}/weather${query}`,
    );
  }
}
