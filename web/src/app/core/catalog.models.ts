export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export interface VeloStation {
  stationId: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  bikesAvailable: number;
  docksAvailable: number;
  electricalBikes: number;
  mechanicalBikes: number;
  isRenting: boolean;
  isInstalled: boolean;
  lastReportedAt: string;
}

export type ParkingKind = 'ouvrage' | 'relais';

export interface ParkingLot {
  parkingId: string;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number;
  longitude: number;
  capacity: number | null;
  kind: ParkingKind;
  isFree: boolean;
  hourlyRate: number | null;
  dailyRate: number | null;
  operator: string | null;
  occupancyAvailable: false;
}

export interface District {
  districtId: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface WeatherHourly {
  time: string;
  temperature: number;
  precipitationProbability: number | null;
}

export interface WeatherDaily {
  date: string;
  weatherCode: number;
  weatherLabel: string;
  temperatureMin: number;
  temperatureMax: number;
}

export interface WeatherCurrent {
  temperature: number;
  apparentTemperature: number;
  weatherCode: number;
  weatherLabel: string;
  observedAt: string;
}

export interface WeatherForecast {
  district: District;
  current: WeatherCurrent;
  hourly: WeatherHourly[];
  daily: WeatherDaily[];
}

export interface AirIndex {
  zoneCode: string;
  zoneLabel: string;
  observedOn: string;
  qualityCode: number;
  qualityLabel: string;
  qualityColor: string;
  dominantPollutant: string | null;
  pollutants: {
    no2: number | null;
    o3: number | null;
    pm10: number | null;
    pm25: number | null;
    so2: number | null;
  };
  advice: string | null;
  source: string;
}

export type AlertSeverity = 'info' | 'warning' | 'severe';

export interface TisseoAlert {
  alertId: string;
  header: string;
  summary: string;
  severity: AlertSeverity;
  effectCode: number | null;
  causeCode: number | null;
  routeIds: string[];
  url: string | null;
  activeFrom: string | null;
  activeUntil: string | null;
}

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}
