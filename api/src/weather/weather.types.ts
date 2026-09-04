export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export interface DistrictDto {
  districtId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherHourlyDto {
  time: string;
  temperature: number;
  precipitationProbability: number | null;
}

export interface WeatherDailyDto {
  date: string;
  weatherCode: number;
  weatherLabel: string;
  temperatureMin: number;
  temperatureMax: number;
}

export interface WeatherCurrentDto {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  weatherLabel: string;
  observedAt: string;
}

export interface WeatherForecastDto {
  district: DistrictDto;
  current: WeatherCurrentDto;
  hourly: WeatherHourlyDto[];
  daily: WeatherDailyDto[];
}

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}

export interface OpenMeteoForecastResponse {
  latitude: number;
  longitude: number;
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: Array<number | null>;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}
