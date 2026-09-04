import { Injectable, Logger } from '@nestjs/common';
import {
  CatalogResponse,
  DistrictDto,
  OpenMeteoForecastResponse,
  SnapshotStatus,
  WeatherDailyDto,
  WeatherForecastDto,
  WeatherHourlyDto,
} from './weather.types';

const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const CACHE_TTL_MS = 30 * 60_000;
const STALE_AFTER_MS = 3 * 60 * 60_000;
const DEFAULT_DISTRICT_ID = 'capitole';

/** Quartiers V1 : points Open-Meteo (favori = météo locale ; ATMO reste métropole). */
const DISTRICTS: DistrictDto[] = [
  {
    districtId: 'capitole',
    name: 'Capitole / Centre',
    latitude: 43.6045,
    longitude: 1.444,
  },
  {
    districtId: 'saint-cyprien',
    name: 'Saint-Cyprien',
    latitude: 43.5985,
    longitude: 1.4295,
  },
  {
    districtId: 'compans',
    name: 'Compans-Caffarelli',
    latitude: 43.6112,
    longitude: 1.4338,
  },
  {
    districtId: 'minimes',
    name: 'Minimes / Matabiau',
    latitude: 43.6155,
    longitude: 1.4485,
  },
  {
    districtId: 'rangueil',
    name: 'Rangueil / Université',
    latitude: 43.5618,
    longitude: 1.4705,
  },
  {
    districtId: 'blagnac',
    name: 'Blagnac',
    latitude: 43.6325,
    longitude: 1.3935,
  },
];

const WEATHER_LABELS: Record<number, string> = {
  0: 'Ciel dégagé',
  1: 'Plutôt dégagé',
  2: 'Partiellement nuageux',
  3: 'Couvert',
  45: 'Brouillard',
  48: 'Brouillard givrant',
  51: 'Bruine légère',
  53: 'Bruine',
  55: 'Bruine forte',
  61: 'Pluie faible',
  63: 'Pluie',
  65: 'Pluie forte',
  71: 'Neige faible',
  73: 'Neige',
  75: 'Neige forte',
  80: 'Averses faibles',
  81: 'Averses',
  82: 'Averses fortes',
  95: 'Orage',
  96: 'Orage avec grêle',
  99: 'Orage violent',
};

interface CachedForecast {
  payload: WeatherForecastDto;
  fetchedAt: Date;
  expiresAt: Date;
}

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly cache = new Map<string, CachedForecast>();

  listDistricts(): CatalogResponse<DistrictDto[]> {
    return {
      status: 'ok',
      fetchedAt: new Date().toISOString(),
      expiresAt: null,
      source: 'TouRose districts (Open-Meteo points)',
      license: 'Open-Meteo',
      data: DISTRICTS,
    };
  }

  async getForecast(
    districtId?: string,
  ): Promise<CatalogResponse<WeatherForecastDto | null>> {
    const district =
      DISTRICTS.find((item) => item.districtId === districtId) ??
      DISTRICTS.find((item) => item.districtId === DEFAULT_DISTRICT_ID)!;

    const cached = this.cache.get(district.districtId);
    if (cached && cached.expiresAt.getTime() > Date.now()) {
      return this.wrap(cached.payload, 'ok', cached.fetchedAt, cached.expiresAt);
    }

    try {
      const forecast = await this.fetchForecast(district);
      const fetchedAt = new Date();
      const expiresAt = new Date(Date.now() + CACHE_TTL_MS);
      this.cache.set(district.districtId, {
        payload: forecast,
        fetchedAt,
        expiresAt,
      });
      this.logger.log(`Open-Meteo ok (${district.districtId})`);
      return this.wrap(forecast, 'ok', fetchedAt, expiresAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Open-Meteo failed: ${message}`);
      if (
        cached &&
        Date.now() - cached.fetchedAt.getTime() < STALE_AFTER_MS
      ) {
        return this.wrap(
          cached.payload,
          'stale',
          cached.fetchedAt,
          cached.expiresAt,
        );
      }
      return this.wrap(null, 'unavailable', null, null);
    }
  }

  private wrap<T>(
    data: T,
    status: SnapshotStatus,
    fetchedAt: Date | null,
    expiresAt: Date | null,
  ): CatalogResponse<T> {
    return {
      status,
      fetchedAt: fetchedAt?.toISOString() ?? null,
      expiresAt: expiresAt?.toISOString() ?? null,
      source: 'Open-Meteo',
      license: 'Open-Meteo Non-Commercial / CC BY 4.0',
      data,
    };
  }

  private async fetchForecast(
    district: DistrictDto,
  ): Promise<WeatherForecastDto> {
    const params = new URLSearchParams({
      latitude: String(district.latitude),
      longitude: String(district.longitude),
      timezone: 'Europe/Paris',
      current: 'temperature_2m,apparent_temperature,weather_code',
      hourly: 'temperature_2m,precipitation_probability',
      daily: 'weather_code,temperature_2m_max,temperature_2m_min',
      forecast_days: '5',
    });
    const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`${url} → HTTP ${response.status}`);
    }
    const payload = (await response.json()) as OpenMeteoForecastResponse;
    return {
      district,
      current: {
        temperature: payload.current.temperature_2m,
        apparentTemperature: payload.current.apparent_temperature,
        weatherCode: payload.current.weather_code,
        weatherLabel: this.weatherLabel(payload.current.weather_code),
        observedAt: payload.current.time,
      },
      hourly: this.mapHourly(payload),
      daily: this.mapDaily(payload),
    };
  }

  private mapHourly(payload: OpenMeteoForecastResponse): WeatherHourlyDto[] {
    const now = Date.now();
    const rows: WeatherHourlyDto[] = [];
    for (let index = 0; index < payload.hourly.time.length; index += 1) {
      const time = payload.hourly.time[index];
      const timestamp = new Date(time).getTime();
      if (timestamp < now - 60 * 60_000) {
        continue;
      }
      rows.push({
        time,
        temperature: payload.hourly.temperature_2m[index],
        precipitationProbability:
          payload.hourly.precipitation_probability[index] ?? null,
      });
      if (rows.length >= 24) {
        break;
      }
    }
    return rows;
  }

  private mapDaily(payload: OpenMeteoForecastResponse): WeatherDailyDto[] {
    return payload.daily.time.map((date, index) => ({
      date,
      weatherCode: payload.daily.weather_code[index],
      weatherLabel: this.weatherLabel(payload.daily.weather_code[index]),
      temperatureMin: payload.daily.temperature_2m_min[index],
      temperatureMax: payload.daily.temperature_2m_max[index],
    }));
  }

  private weatherLabel(code: number): string {
    return WEATHER_LABELS[code] ?? `Code météo ${code}`;
  }
}
