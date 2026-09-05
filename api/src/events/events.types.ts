export type SnapshotStatus = 'ok' | 'stale' | 'unavailable';

export type EventProvider = 'ods' | 'openagenda';

export type EventImageSource =
  | 'openagenda'
  | 'commons'
  | 'wikidata'
  | 'wikipedia'
  | null;

export interface EventTimingDto {
  begin: string;
  end: string | null;
}

export interface CultureEventDto {
  eventId: string;
  title: string;
  summary: string | null;
  longDescription: string | null;
  startsOn: string | null;
  endsOn: string | null;
  schedule: string | null;
  timings: EventTimingDto[];
  venueName: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  district: string | null;
  department: string | null;
  countryCode: string | null;
  category: string | null;
  theme: string | null;
  type: string | null;
  keywords: string[];
  latitude: number | null;
  longitude: number | null;
  bookingUrl: string | null;
  canonicalUrl: string | null;
  registrationUrl: string | null;
  onlineAccessLink: string | null;
  /** Extra useful links from OpenAgenda (site, infos pratiques…). */
  links: string[];
  status: string | null;
  attendanceMode: string | null;
  age: string | null;
  conditions: string | null;
  accessibility: string | null;
  imageCredits: string | null;
  provider: EventProvider;
  imageUrl: string | null;
  /** Larger OpenAgenda CDN asset for detail pages (base / full). */
  imageUrlLarge: string | null;
  imageSource: EventImageSource;
  updatedAt: string | null;
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
  descriptif_long?: string | null;
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
  after?: Array<string | number> | null;
}

export interface OpenAgendaTiming {
  begin?: string;
  end?: string;
}

export interface OpenAgendaLocation {
  name?: string;
  address?: string;
  city?: string;
  postalCode?: string;
  district?: string;
  department?: string;
  countryCode?: string;
  latitude?: number;
  longitude?: number;
}

export interface OpenAgendaImage {
  filename?: string;
  base?: string;
  size?: { width?: number; height?: number };
  variants?: Array<{
    filename?: string;
    type?: string;
    size?: { width?: number; height?: number };
  }>;
}

export interface OpenAgendaEvent {
  uid?: number;
  title?: string | Record<string, string>;
  description?: string | Record<string, string>;
  longDescription?: string | Record<string, string>;
  keywords?: { fr?: string[] } | string[];
  location?: OpenAgendaLocation;
  timings?: OpenAgendaTiming[];
  firstTiming?: OpenAgendaTiming;
  lastTiming?: OpenAgendaTiming;
  canonicalUrl?: string;
  registrationUrl?: string;
  registration?: Array<{ type?: string; value?: string }>;
  links?: Array<{ link?: string; label?: string | Record<string, string> }>;
  onlineAccessLink?: string;
  status?: string | number;
  attendanceMode?: string | number;
  age?: string | Record<string, string> | { min?: number; max?: number };
  conditions?: string | Record<string, string>;
  accessibility?: string | Record<string, string> | unknown;
  image?: OpenAgendaImage | null;
  imageCredits?: string | Record<string, string> | null;
  updatedAt?: number | string;
}

export interface OpenAgendaEventsResponse {
  total?: number;
  events?: OpenAgendaEvent[];
  after?: string[] | null;
}
