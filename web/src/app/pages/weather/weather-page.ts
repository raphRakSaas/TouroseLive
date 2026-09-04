import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AirIndex,
  CatalogResponse,
  District,
  WeatherForecast,
} from '../../core/catalog.models';
import { AirApi } from '../../core/air-api';
import { WeatherApi } from '../../core/weather-api';

@Component({
  selector: 'app-weather-page',
  imports: [DatePipe, DecimalPipe],
  templateUrl: './weather-page.html',
  styleUrl: './weather-page.scss',
})
export class WeatherPage implements OnInit {
  private readonly weatherApi = inject(WeatherApi);
  private readonly airApi = inject(AirApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly districts = signal<District[]>([]);
  protected readonly catalog = signal<CatalogResponse<WeatherForecast> | null>(
    null,
  );
  protected readonly airCatalog = signal<CatalogResponse<AirIndex | null> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);
  protected readonly airError = signal<string | null>(null);
  protected readonly selectedDistrictId = signal('capitole');

  ngOnInit(): void {
    const districtId =
      this.route.snapshot.queryParamMap.get('districtId') ?? 'capitole';
    this.selectedDistrictId.set(districtId);

    this.weatherApi.listDistricts().subscribe({
      next: (payload) => this.districts.set(payload.data),
      error: () => this.districts.set([]),
    });
    this.loadForecast(districtId);
    this.loadAir();
  }

  protected onDistrictChange(districtId: string): void {
    this.selectedDistrictId.set(districtId);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { districtId },
      queryParamsHandling: 'merge',
    });
    this.loadForecast(districtId);
  }

  private loadForecast(districtId: string): void {
    this.loadError.set(null);
    this.weatherApi.getForecast(districtId).subscribe({
      next: (payload) => {
        if (!payload.data) {
          this.loadError.set('Météo temporairement indisponible.');
          this.catalog.set(payload);
          return;
        }
        this.catalog.set(payload);
      },
      error: () => this.loadError.set('Météo temporairement indisponible.'),
    });
  }

  private loadAir(): void {
    this.airError.set(null);
    this.airApi.getIndex().subscribe({
      next: (payload) => {
        this.airCatalog.set(payload);
        if (!payload.data || payload.status === 'unavailable') {
          this.airError.set('Qualité de l’air temporairement indisponible.');
        }
      },
      error: () =>
        this.airError.set('Qualité de l’air temporairement indisponible.'),
    });
  }
}
