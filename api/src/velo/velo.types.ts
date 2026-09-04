export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export interface LocalizedName {
  text: string;
  language: string;
}

export interface GbfsFeedIndex {
  last_updated: string;
  ttl: number;
  data: {
    feeds: Array<{ name: string; url: string }>;
  };
}

export interface GbfsStationInformation {
  station_id: string;
  name: LocalizedName[] | string;
  address?: string;
  lat: number;
  lon: number;
  capacity?: number;
}

export interface GbfsVehicleTypeCount {
  vehicle_type_id: string;
  count: number;
}

export interface GbfsStationStatus {
  station_id: string;
  num_vehicles_available: number;
  num_docks_available: number;
  num_vehicles_disabled?: number;
  num_docks_disabled?: number;
  is_installed: boolean;
  is_renting: boolean;
  is_returning: boolean;
  last_reported: string;
  vehicle_types_available?: GbfsVehicleTypeCount[];
}

export interface VeloStationDto {
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

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}
