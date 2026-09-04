import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import {
  AirIndex,
  CatalogResponse,
  District,
  WeatherForecast,
} from '../../core/catalog.models';
import { AirApi } from '../../core/air-api';
import { WeatherApi } from '../../core/weather-api';
import {
  WeatherIcon,
  weatherIconFromPrecip,
  weatherIconKind,
  weatherSkyTone,
} from './weather-icon';

@Component({
  selector: 'app-weather-page',
  imports: [DatePipe, DecimalPipe, WeatherIcon],
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

  protected readonly skyTone = computed(() => {
    const code = this.catalog()?.data?.current.weatherCode;
    return weatherSkyTone(weatherIconKind(code));
  });

  protected readonly currentIcon = computed(() =>
    weatherIconKind(this.catalog()?.data?.current.weatherCode),
  );

  protected readonly airLevels = [
    { code: 1, label: 'Bon' },
    { code: 2, label: 'Moyen' },
    { code: 3, label: 'Dégradé' },
    { code: 4, label: 'Mauvais' },
    { code: 5, label: 'Très mauvais' },
    { code: 6, label: 'Extrême' },
  ];

  protected readonly dayRange = computed(() => {
    const days = this.catalog()?.data?.daily ?? [];
    if (days.length === 0) {
      return { min: 0, max: 1 };
    }
    const min = Math.min(...days.map((day) => day.temperatureMin));
    const max = Math.max(...days.map((day) => day.temperatureMax));
    return { min, max: max === min ? min + 1 : max };
  });

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

  protected iconForCode(code: number) {
    return weatherIconKind(code);
  }

  protected iconForHour(precipitationProbability: number | null) {
    return weatherIconFromPrecip(precipitationProbability);
  }

  protected tempBarStyle(
    min: number,
    max: number,
  ): { left: string; width: string } {
    const range = this.dayRange();
    const span = range.max - range.min;
    const left = ((min - range.min) / span) * 100;
    const width = ((max - min) / span) * 100;
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(8, width)}%`,
    };
  }

  protected pollutantEntries(air: AirIndex): Array<{ key: string; value: number | null }> {
    return [
      { key: 'NO₂', value: air.pollutants.no2 },
      { key: 'O₃', value: air.pollutants.o3 },
      { key: 'PM10', value: air.pollutants.pm10 },
      { key: 'PM2.5', value: air.pollutants.pm25 },
      { key: 'SO₂', value: air.pollutants.so2 },
    ];
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
