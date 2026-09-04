export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export interface AirIndexDto {
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

export interface CatalogResponse<T> {
  status: SnapshotStatus;
  fetchedAt: string | null;
  expiresAt: string | null;
  source: string;
  license: string;
  data: T;
}

export interface AtmoFeatureAttributes {
  date_ech: number;
  code_qual: number;
  lib_qual: string;
  coul_qual: string;
  code_no2?: number | null;
  code_o3?: number | null;
  code_pm10?: number | null;
  code_pm25?: number | null;
  code_so2?: number | null;
  lib_zone?: string;
  source?: string;
}

export interface AtmoQueryResponse {
  features?: Array<{ attributes: AtmoFeatureAttributes }>;
}
