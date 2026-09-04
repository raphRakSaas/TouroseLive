export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export type AlertSeverity = 'info' | 'warning' | 'severe';

export interface TisseoAlertDto {
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

export interface GtfsRtTranslatedString {
  translation?: Array<{ text?: string; language?: string }>;
}

export interface GtfsRtInformedEntity {
  agency_id?: string;
  route_id?: string;
  stop_id?: string;
  trip?: { trip_id?: string };
}

export interface GtfsRtTimeRange {
  start?: number;
  end?: number;
}

export interface GtfsRtAlert {
  informed_entity?: GtfsRtInformedEntity[];
  cause?: number;
  effect?: number;
  url?: GtfsRtTranslatedString;
  header_text?: GtfsRtTranslatedString;
  description_text?: GtfsRtTranslatedString;
  active_period?: GtfsRtTimeRange[];
}

export interface GtfsRtEntity {
  id: string;
  alert?: GtfsRtAlert;
}

export interface GtfsRtFeedMessage {
  header?: { timestamp?: number; gtfs_realtime_version?: string };
  entity?: GtfsRtEntity[];
}
