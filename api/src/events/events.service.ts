import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  CatalogResponse,
  CultureEventDto,
  OdsEventRecord,
  OdsExploreResponse,
  OpenAgendaAgenda,
  OpenAgendaAgendasResponse,
  OpenAgendaEvent,
  OpenAgendaEventsResponse,
  SnapshotStatus,
} from './events.types';

const ODS_URL =
  'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets/agenda-des-manifestations-culturelles-so-toulouse/records';
const OPENAGENDA_API = 'https://api.openagenda.com/v2';
/** Réseau officiel Toulouse Métropole sur OpenAgenda (gratuit, licence ouverte). */
const TOULOUSE_NETWORK_ID = '78678694';
const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const POLL_MS = 60 * 60_000;
const STALE_AFTER_MS = 12 * 60 * 60_000;
const PAGE_SIZE = 100;
const MAX_PAGES = 5;
/** OpenAgenda agendas listing page size (API max 100). */
const AGENDA_PAGE_SIZE = 100;
/** OpenAgenda events page size (API max 300). */
const EVENTS_PAGE_SIZE = 300;
/** Soft ceiling so a runaway sync cannot blow memory; network is ~4k upcoming. */
const MAX_OPENAGENDA_EVENTS = 6000;
const FETCH_TIMEOUT_MS = 25_000;
const OPENAGENDA_CONCURRENCY = 4;

@Injectable()
export class EventsService implements OnModuleInit {
  private readonly logger = new Logger(EventsService.name);
  private events: CultureEventDto[] = [];
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';
  private openAgendaConfigured = false;
  private sourceLabel =
    'Toulouse Métropole Open Data / agenda-des-manifestations-culturelles-so-toulouse';

  async onModuleInit(): Promise<void> {
    // Don't block Nest listen() — OpenAgenda / ODS can take minutes.
    void this.refreshEvents();
  }

  @Interval(POLL_MS)
  async pollEvents(): Promise<void> {
    await this.refreshEvents();
  }

  listEvents(): CatalogResponse<CultureEventDto[]> {
    const today = this.parisToday();
    const upcoming = this.events.filter((event) =>
      this.isUpcomingOrOngoing(event, today),
    );
    return this.wrap(upcoming);
  }

  getEvent(eventId: string): CatalogResponse<CultureEventDto | null> {
    const found =
      this.events.find((event) => event.eventId === eventId) ?? null;
    return this.wrap(found);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source: this.sourceLabel,
      license: 'Licence Ouverte / OpenAgenda',
      data,
      openAgendaConfigured: this.openAgendaConfigured,
    };
  }

  private async refreshEvents(): Promise<void> {
    const apiKey = process.env.OPENAGENDA_PUBLIC_KEY?.trim() ?? '';
    this.openAgendaConfigured = apiKey.length > 0;
    this.logger.log(
      `Events refresh started (openagenda=${this.openAgendaConfigured ? 'on' : 'off'})`,
    );

    try {
      // 1) Publish ODS quickly so /v1/events is never empty while OA loads.
      const odsEvents = await this.fetchOdsEvents();
      this.publishCatalog(odsEvents, []);
      this.logger.log(`ODS events ready (${odsEvents.length})`);

      let openAgendaEvents: CultureEventDto[] = [];
      if (this.openAgendaConfigured) {
        openAgendaEvents = await this.fetchOpenAgendaEvents(apiKey);
        this.publishCatalog(odsEvents, openAgendaEvents);
        this.logger.log(
          `Events refresh ok (ods=${odsEvents.length}, openagenda=${openAgendaEvents.length}, merged=${this.events.length})`,
        );
      } else {
        this.logger.warn(
          'OPENAGENDA_PUBLIC_KEY manquante — agenda limité à ODS So Toulouse. Clé gratuite : https://openagenda.com/settings/apiKey',
        );
      }

      // OpenAgenda already ships images; skip Wikimedia enrichment (rate limits).
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Events refresh failed: ${message}`);
      if (
        this.fetchedAt &&
        Date.now() - this.fetchedAt.getTime() < STALE_AFTER_MS
      ) {
        this.snapshotStatus = 'stale';
      } else {
        this.snapshotStatus = 'unavailable';
      }
    }
  }

  private publishCatalog(
    odsEvents: CultureEventDto[],
    openAgendaEvents: CultureEventDto[],
  ): void {
    const today = this.parisToday();
    this.events = this.mergeEvents([...openAgendaEvents, ...odsEvents]).filter(
      (event) => this.isUpcomingOrOngoing(event, today),
    );
    this.sourceLabel = this.openAgendaConfigured
      ? `OpenAgenda réseau Toulouse Métropole + ODS So Toulouse (${this.events.length} événements)`
      : `ODS So Toulouse seulement (${this.events.length}). Ajoute OPENAGENDA_PUBLIC_KEY (gratuite) pour plus d’événements.`;
    this.fetchedAt = new Date();
    this.expiresAt = new Date(Date.now() + POLL_MS);
    this.snapshotStatus = 'ok';
  }

  private mergeEvents(events: CultureEventDto[]): CultureEventDto[] {
    const seenIds = new Set<string>();
    const seenSoftKeys = new Set<string>();
    const merged: CultureEventDto[] = [];
    for (const event of events) {
      if (seenIds.has(event.eventId)) {
        continue;
      }
      const softKey = `${event.title.toLowerCase()}|${event.startsOn ?? ''}|${event.venueName ?? ''}`;
      // OpenAgenda UIDs are authoritative; only soft-dedupe ODS against already kept rows.
      if (event.provider === 'ods' && seenSoftKeys.has(softKey)) {
        continue;
      }
      seenIds.add(event.eventId);
      seenSoftKeys.add(softKey);
      merged.push(event);
    }
    return merged.sort((left, right) =>
      (left.startsOn ?? '').localeCompare(right.startsOn ?? ''),
    );
  }

  private async fetchOdsEvents(): Promise<CultureEventDto[]> {
    const records: OdsEventRecord[] = [];
    for (let page = 0; page < MAX_PAGES; page += 1) {
      const offset = page * PAGE_SIZE;
      const payload = await this.fetchJson<OdsExploreResponse<OdsEventRecord>>(
        `${ODS_URL}?limit=${PAGE_SIZE}&offset=${offset}`,
      );
      records.push(...payload.results);
      if (offset + payload.results.length >= payload.total_count) {
        break;
      }
    }

    const today = this.parisToday();
    return records
      .map((record) => this.mapOdsEvent(record))
      .filter((event): event is CultureEventDto => event !== null)
      .filter((event) => this.isUpcomingOrOngoing(event, today));
  }

  private async fetchOpenAgendaEvents(
    apiKey: string,
  ): Promise<CultureEventDto[]> {
    const agendas = await this.listToulouseAgendas(apiKey);
    this.logger.log(`OpenAgenda agendas listed (${agendas.length})`);
    const chunks: CultureEventDto[][] = Array.from(
      { length: agendas.length },
      () => [],
    );
    let cursor = 0;

    const worker = async (): Promise<void> => {
      while (cursor < agendas.length) {
        const index = cursor;
        cursor += 1;
        const agenda = agendas[index];
        try {
          chunks[index] = await this.listAgendaUpcomingEvents(
            apiKey,
            agenda.uid,
          );
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.warn(`OpenAgenda agenda ${agenda.uid} failed: ${message}`);
          chunks[index] = [];
        }
      }
    };

    await Promise.all(
      Array.from({ length: OPENAGENDA_CONCURRENCY }, () => worker()),
    );

    const events = chunks.flat();
    if (events.length > MAX_OPENAGENDA_EVENTS) {
      this.logger.warn(
        `OpenAgenda capped at ${MAX_OPENAGENDA_EVENTS} of ${events.length} events`,
      );
    }
    this.logger.log(
      `OpenAgenda events fetched (${Math.min(events.length, MAX_OPENAGENDA_EVENTS)})`,
    );
    return events.slice(0, MAX_OPENAGENDA_EVENTS);
  }

  private async listToulouseAgendas(
    apiKey: string,
  ): Promise<OpenAgendaAgenda[]> {
    const agendas: OpenAgendaAgenda[] = [];
    let after: Array<string | number> | null = null;
    let pages = 0;

    while (pages < 20) {
      pages += 1;
      const params = new URLSearchParams({
        key: apiKey,
        network: TOULOUSE_NETWORK_ID,
        size: String(AGENDA_PAGE_SIZE),
      });
      if (after?.length) {
        for (const value of after) {
          params.append('after[]', String(value));
        }
      }
      const payload = await this.fetchJson<OpenAgendaAgendasResponse>(
        `${OPENAGENDA_API}/agendas?${params.toString()}`,
      );
      const batch = payload.agendas ?? [];
      if (batch.length === 0) {
        break;
      }
      agendas.push(...batch);
      const nextAfter = payload.after ?? null;
      if (
        !nextAfter ||
        nextAfter.length === 0 ||
        agendas.length >= (payload.total ?? Number.POSITIVE_INFINITY)
      ) {
        break;
      }
      after = nextAfter;
    }

    return agendas;
  }

  private async listAgendaUpcomingEvents(
    apiKey: string,
    agendaUid: number,
  ): Promise<CultureEventDto[]> {
    const mapped: CultureEventDto[] = [];
    const today = this.parisToday();
    let after: string[] | null = null;
    let pages = 0;

    while (pages < 40) {
      pages += 1;
      const params = new URLSearchParams({
        key: apiKey,
        size: String(EVENTS_PAGE_SIZE),
        monolingual: 'fr',
        detailed: '1',
        longDescriptionFormat: 'HTML',
        sort: 'timings.asc',
      });
      const queryParts = [
        params.toString(),
        'relative[]=upcoming',
        'relative[]=current',
      ];
      if (after?.length) {
        for (const value of after) {
          queryParts.push(`after[]=${encodeURIComponent(value)}`);
        }
      }
      const payload = await this.fetchJson<OpenAgendaEventsResponse>(
        `${OPENAGENDA_API}/agendas/${agendaUid}/events?${queryParts.join('&')}`,
      );
      const batch = payload.events ?? [];
      if (batch.length === 0) {
        break;
      }

      for (const event of batch) {
        try {
          const cultureEvent = this.mapOpenAgendaEvent(event);
          if (
            cultureEvent &&
            this.isUpcomingOrOngoing(cultureEvent, today)
          ) {
            mapped.push(cultureEvent);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.debug(
            `OpenAgenda event map failed (${event.uid}): ${message}`,
          );
        }
      }

      const nextAfter = payload.after ?? null;
      if (!nextAfter || nextAfter.length === 0) {
        break;
      }
      after = nextAfter.map(String);
    }

    return mapped;
  }

  private mapOpenAgendaEvent(event: OpenAgendaEvent): CultureEventDto | null {
    const title = this.localizedText(event.title);
    if (!title || !event.uid) {
      return null;
    }
    const today = this.parisToday();
    const allTimings = (event.timings ?? []).filter((timing) =>
      Boolean(timing.begin),
    );
    const upcomingTimings = allTimings.filter((timing) => {
      const endDate = (timing.end ?? timing.begin ?? '').slice(0, 10);
      return endDate >= today;
    });
    const first =
      upcomingTimings[0] ?? event.firstTiming ?? allTimings[0] ?? null;
    const last =
      upcomingTimings[upcomingTimings.length - 1] ??
      event.lastTiming ??
      allTimings[allTimings.length - 1] ??
      first;
    const latitude = event.location?.latitude ?? null;
    const longitude = event.location?.longitude ?? null;
    const openAgendaImages = this.openAgendaImageUrls(event);
    const timings = (upcomingTimings.length > 0 ? upcomingTimings : allTimings).map(
      (timing) => ({
        begin: timing.begin as string,
        end: timing.end ?? null,
      }),
    );
    const keywords = this.keywordList(event.keywords);
    const ticketUrl = this.openAgendaTicketUrl(event);
    const relatedLinks = this.openAgendaLinks(event);
    return {
      eventId: `oa-${event.uid}`,
      title,
      summary: this.localizedText(event.description) || null,
      longDescription: this.localizedText(event.longDescription) || null,
      startsOn: first?.begin ? first.begin.slice(0, 10) : null,
      endsOn: last?.end ? last.end.slice(0, 10) : first?.begin ? first.begin.slice(0, 10) : null,
      schedule: first?.begin
        ? new Date(first.begin).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris',
          })
        : null,
      timings,
      venueName: event.location?.name ?? null,
      address: event.location?.address ?? null,
      city: event.location?.city ?? null,
      postalCode: event.location?.postalCode ?? null,
      district: event.location?.district ?? null,
      department: event.location?.department ?? null,
      countryCode: event.location?.countryCode ?? null,
      category: keywords[0] ?? null,
      theme: null,
      type: 'OpenAgenda',
      keywords,
      latitude,
      longitude,
      bookingUrl: ticketUrl,
      canonicalUrl: event.canonicalUrl ?? null,
      registrationUrl: ticketUrl,
      onlineAccessLink: event.onlineAccessLink || null,
      links: relatedLinks,
      status: this.statusLabel(event.status),
      attendanceMode:
        event.attendanceMode != null ? String(event.attendanceMode) : null,
      age: this.ageText(event.age),
      conditions: this.localizedText(event.conditions) || null,
      accessibility: this.accessibilityText(event.accessibility),
      imageCredits: this.localizedText(event.imageCredits) || null,
      provider: 'openagenda',
      imageUrl: openAgendaImages.thumb,
      imageUrlLarge: openAgendaImages.large,
      imageSource: openAgendaImages.thumb ? 'openagenda' : null,
      updatedAt:
        event.updatedAt != null ? String(event.updatedAt) : null,
    };
  }

  private mapOdsEvent(record: OdsEventRecord): CultureEventDto | null {
    const title =
      record.nom_de_la_manifestation?.trim() ||
      record.nom_generique?.trim() ||
      '';
    if (!title) {
      return null;
    }
    const address = [record.lieu_adresse_1, record.lieu_adresse_2]
      .filter(Boolean)
      .join(', ');
    const latitude = this.toNumber(record.googlemap_latitude);
    const longitude = this.toNumber(record.googlemap_longitude);
    return {
      eventId: `ods-${record.identifiant || `${title}-${record.date_debut ?? 'na'}`}`,
      title,
      summary: record.descriptif_court?.trim() || null,
      longDescription: record.descriptif_long?.trim() || null,
      startsOn: record.date_debut ?? null,
      endsOn: record.date_fin ?? null,
      schedule: record.horaires?.trim() || null,
      timings: [],
      venueName: record.lieu_nom?.trim() || null,
      address: address || null,
      city: record.commune?.trim() || null,
      postalCode: null,
      district: null,
      department: null,
      countryCode: 'FR',
      category: record.categorie_de_la_manifestation?.trim() || null,
      theme: record.theme_de_la_manifestation?.trim() || null,
      type: record.type_de_manifestation?.trim() || null,
      keywords: [
        record.type_de_manifestation,
        record.categorie_de_la_manifestation,
        record.theme_de_la_manifestation,
      ].filter((value): value is string => Boolean(value?.trim())),
      latitude,
      longitude,
      bookingUrl: record.reservation_site_internet?.trim() || null,
      canonicalUrl: null,
      registrationUrl: record.reservation_site_internet?.trim() || null,
      onlineAccessLink: null,
      links: [],
      status: null,
      attendanceMode: null,
      age: null,
      conditions: null,
      accessibility: null,
      imageCredits: null,
      provider: 'ods',
      imageUrl: null,
      imageUrlLarge: null,
      imageSource: null,
      updatedAt: null,
    };
  }

  private openAgendaTicketUrl(event: OpenAgendaEvent): string | null {
    if (event.registrationUrl?.trim()) {
      return event.registrationUrl.trim();
    }
    for (const entry of event.registration ?? []) {
      const value = entry.value?.trim();
      if (!value) {
        continue;
      }
      if (
        entry.type === 'link' ||
        entry.type === 'email' ||
        value.startsWith('http')
      ) {
        return value;
      }
    }
    return null;
  }

  private openAgendaLinks(event: OpenAgendaEvent): string[] {
    const links: string[] = [];
    const seen = new Set<string>();
    const push = (value: string | null | undefined): void => {
      const trimmed = value?.trim();
      if (!trimmed || seen.has(trimmed)) {
        return;
      }
      seen.add(trimmed);
      links.push(trimmed);
    };
    for (const entry of event.links ?? []) {
      push(entry.link);
    }
    push(event.onlineAccessLink);
    return links;
  }

  private statusLabel(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    const code = String(value);
    const labels: Record<string, string> = {
      '1': 'Programmé',
      '2': 'Reporté',
      '3': 'Complet',
      '4': 'Annulé',
      programmed: 'Programmé',
      rescheduled: 'Reporté',
      full: 'Complet',
      cancelled: 'Annulé',
    };
    return labels[code] ?? labels[code.toLowerCase()] ?? null;
  }

  private keywordList(value: unknown): string[] {
    if (!value) {
      return [];
    }
    const toText = (item: unknown): string => {
      if (typeof item === 'string') {
        return item.trim();
      }
      return this.localizedText(item);
    };
    if (Array.isArray(value)) {
      return value.map(toText).filter(Boolean);
    }
    if (typeof value === 'object') {
      const french = (value as { fr?: unknown }).fr;
      if (Array.isArray(french)) {
        return french.map(toText).filter(Boolean);
      }
    }
    return [];
  }

  private ageText(value: unknown): string | null {
    if (value == null) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    if (typeof value === 'object') {
      const record = value as { min?: number | null; max?: number | null };
      const minimum = record.min;
      const maximum = record.max;
      if (minimum != null && maximum != null) {
        return `${minimum}–${maximum} ans`;
      }
      if (minimum != null) {
        return `À partir de ${minimum} ans`;
      }
      if (maximum != null) {
        return `Jusqu’à ${maximum} ans`;
      }
    }
    return null;
  }

  private accessibilityText(value: unknown): string | null {
    if (!value) {
      return null;
    }
    if (typeof value === 'string') {
      return value.trim() || null;
    }
    if (typeof value === 'object') {
      const flags = value as Record<string, unknown>;
      const labels: Record<string, string> = {
        ii: 'Handicap intellectuel',
        hi: 'Handicap auditif',
        vi: 'Handicap visuel',
        pi: 'Handicap psychique',
        mi: 'Mobilité réduite',
      };
      const enabled = Object.entries(labels)
        .filter(([code]) => Boolean(flags[code]))
        .map(([, label]) => label);
      return enabled.length > 0 ? enabled.join(' · ') : null;
    }
    return null;
  }

  private openAgendaImageUrls(event: OpenAgendaEvent): {
    thumb: string | null;
    large: string | null;
  } {
    const image = event.image;
    if (!image?.base) {
      return { thumb: null, large: null };
    }
    const base = image.base.endsWith('/') ? image.base : `${image.base}/`;
    const variantFile = (typeName: string): string | null => {
      const match = image.variants?.find(
        (variant) => variant.type === typeName && Boolean(variant.filename),
      );
      return match?.filename ? `${base}${match.filename}` : null;
    };

    // OpenAgenda CDN: thumb for grids, base (~700) preferred for detail,
    // full only as last resort (often multi‑MB).
    const thumb =
      variantFile('thumbnail') ??
      (image.filename ? `${base}${image.filename}` : null);
    const large =
      (image.filename ? `${base}${image.filename}` : null) ??
      variantFile('full') ??
      variantFile('thumbnail');

    return { thumb, large };
  }

  private localizedText(value: unknown): string {
    if (value == null) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (typeof value === 'object') {
      const record = value as Record<string, unknown>;
      // Prefer language maps; ignore age-like {min,max} objects.
      if ('fr' in record || 'en' in record) {
        const preferred = record['fr'] ?? record['en'];
        if (typeof preferred === 'string') {
          return preferred.trim();
        }
      }
      for (const candidate of Object.values(record)) {
        if (typeof candidate === 'string' && candidate.trim()) {
          return candidate.trim();
        }
      }
    }
    return '';
  }

  private parisToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private isUpcomingOrOngoing(event: CultureEventDto, today: string): boolean {
    // Keep only events that have not fully ended (date in Europe/Paris).
    const end = event.endsOn ?? event.startsOn ?? '';
    if (!end) {
      return false;
    }
    return end >= today;
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const safeUrl = this.redactUrl(url);
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': USER_AGENT,
          Accept: 'application/json',
        },
      });
      if (!response.ok) {
        throw new Error(`${safeUrl} → HTTP ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`${safeUrl} → timeout after ${FETCH_TIMEOUT_MS}ms`);
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private redactUrl(url: string): string {
    try {
      const parsed = new URL(url);
      if (parsed.searchParams.has('key')) {
        parsed.searchParams.set('key', '[redacted]');
      }
      return parsed.toString();
    } catch {
      return url.replace(/key=[^&]+/gi, 'key=[redacted]');
    }
  }
}
