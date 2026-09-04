export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export type EventProvider = 'ods' | 'openagenda';

export type EventImageSource = 'openagenda' | 'commons' | 'wikidata' | 'wikipedia' | null;

export interface CultureEventDto {
  eventId: string;
  title: string;
  summary: string | null;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  category: string | null;
  theme: string | null;
  type: string | null;
  latitude: number | null;
  longitude: number | null;
  bookingUrl: string | null;
  provider: EventProvider;
  imageUrl: string | null;
  imageSource: EventImageSource;
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

export interface OdsExploreResponse<T> {
  total_count: number;
  results: T[];
}

export interface OdsEventRecord {
  identifiant?: string;
  nom_generique?: string | null;
  nom_de_la_manifestation?: string | null;
  descriptif_court?: string | null;
  date_debut?: string | null;
  date_fin?: string | null;
  horaires?: string | null;
  lieu_nom?: string | null;
  lieu_adresse_1?: string | null;
  lieu_adresse_2?: string | null;
  commune?: string | null;
  type_de_manifestation?: string | null;
  categorie_de_la_manifestation?: string | null;
  theme_de_la_manifestation?: string | null;
  googlemap_latitude?: number | string | null;
  googlemap_longitude?: number | string | null;
  reservation_site_internet?: string | null;
}

export interface OpenAgendaAgenda {
  uid: number;
  title?: string | Record<string, string>;
  slug?: string;
}

export interface OpenAgendaAgendasResponse {
  total?: number;
  agendas?: OpenAgendaAgenda[];
}

export interface OpenAgendaTiming {
  begin?: string;
  end?: string;
}

export interface OpenAgendaLocation {
  name?: string;
  address?: string;
  city?: string;
  latitude?: number;
  longitude?: number;
}

export interface OpenAgendaImage {
  filename?: string;
  base?: string;
  variants?: Array<{ filename?: string; type?: string }>;
}

export interface OpenAgendaEvent {
  uid?: number;
  title?: string | Record<string, string>;
  description?: string | Record<string, string>;
  keywords?: { fr?: string[] } | string[];
  location?: OpenAgendaLocation;
  timings?: OpenAgendaTiming[];
  firstTiming?: OpenAgendaTiming;
  lastTiming?: OpenAgendaTiming;
  canonicalUrl?: string;
  registrationUrl?: string;
  image?: OpenAgendaImage | null;
}

export interface OpenAgendaEventsResponse {
  total?: number;
  events?: OpenAgendaEvent[];
  after?: string[] | null;
}
