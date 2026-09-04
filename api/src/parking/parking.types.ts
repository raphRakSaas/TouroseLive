export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export type ParkingKind = 'ouvrage' | 'relais';

export interface OdsExploreResponse<T> {
  total_count: number;
  results: T[];
}

export interface OdsParkingRecord {
  id: string;
  nom: string;
  adresse?: string | null;
  commune?: string | null;
  fonction?: string | null;
  gestionnaire?: string | null;
  gratuit?: string | null;
  nb_places?: number | null;
  tarif_1h?: number | null;
  tarif_24h?: number | null;
  geo_point_2d?: { lat: number; lon: number } | null;
  ylat?: number | null;
  xlong?: number | null;
}

export interface ParkingLotDto {
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

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}
