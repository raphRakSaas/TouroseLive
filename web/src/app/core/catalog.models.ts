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

export interface EventTiming {
  begin: string;
  end: string | null;
}

export interface CultureEvent {
  eventId: string;
  title: string;
  summary: string | null;
  longDescription?: string | null;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
  timings?: EventTiming[];
  venueName: string | null;
  address: string | null;
  city: string | null;
  postalCode?: string | null;
  district?: string | null;
  department?: string | null;
  countryCode?: string | null;
  category: string | null;
  theme: string | null;
  type: string | null;
  keywords?: string[];
  latitude: number | null;
  longitude: number | null;
  bookingUrl: string | null;
  canonicalUrl?: string | null;
  registrationUrl?: string | null;
  onlineAccessLink?: string | null;
  status?: string | null;
  attendanceMode?: string | null;
  age?: string | null;
  conditions?: string | null;
  accessibility?: string | null;
  provider?: 'ods' | 'openagenda';
  imageUrl?: string | null;
  imageUrlLarge?: string | null;
  imageSource?: 'openagenda' | 'commons' | 'wikidata' | 'wikipedia' | null;
  updatedAt?: string | null;
}

export type PlaceKind =
  | 'museum'
  | 'gallery'
  | 'theatre'
  | 'playground'
  | 'garden'
  | 'walk'
  | 'heritage';

export interface Place {
  placeId: string;
  kind: PlaceKind;
  name: string;
  address: string | null;
  city: string | null;
  district: string | null;
  description: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  protection: string | null;
  imageUrl?: string | null;
  imageSource?: 'wikidata' | 'wikipedia' | 'commons' | null;
}

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
  openAgendaConfigured?: boolean;
}
