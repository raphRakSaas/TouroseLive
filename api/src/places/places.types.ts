export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export type PlaceKind =
  | 'museum'
  | 'gallery'
  | 'theatre'
  | 'playground'
  | 'garden'
  | 'walk'
  | 'heritage';

export interface PlaceDto {
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
}

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}

export interface OdsExploreResponse<T> {
  total_count: number;
  results: T[];
}

export interface OdsGeoPoint {
  lat?: number;
  lon?: number;
}
