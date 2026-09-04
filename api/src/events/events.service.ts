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
const MAX_AGENDAS = 25;
const MAX_EVENTS_PER_AGENDA = 80;

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
    await this.refreshEvents();
  }

  @Interval(POLL_MS)
  async pollEvents(): Promise<void> {
    await this.refreshEvents();
  }

  listEvents(): CatalogResponse<CultureEventDto[]> {
    return this.wrap(this.events);
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

    try {
      const odsEvents = await this.fetchOdsEvents();
      let openAgendaEvents: CultureEventDto[] = [];
      if (this.openAgendaConfigured) {
        openAgendaEvents = await this.fetchOpenAgendaEvents(apiKey);
      } else {
        this.logger.warn(
          'OPENAGENDA_PUBLIC_KEY manquante — agenda limité à ODS So Toulouse (souvent peu d’événements futurs). Clé gratuite : https://openagenda.com/settings/apiKey',
        );
      }

      this.events = this.mergeEvents([...openAgendaEvents, ...odsEvents]);
      this.sourceLabel = this.openAgendaConfigured
        ? `OpenAgenda réseau Toulouse Métropole + ODS So Toulouse (${this.events.length} événements)`
        : `ODS So Toulouse seulement (${this.events.length}). Ajoute OPENAGENDA_PUBLIC_KEY (gratuite) pour plus d’événements.`;
      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      this.logger.log(
        `Events refresh ok (ods=${odsEvents.length}, openagenda=${openAgendaEvents.length}, merged=${this.events.length})`,
      );
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

  private mergeEvents(events: CultureEventDto[]): CultureEventDto[] {
    const seen = new Set<string>();
    const merged: CultureEventDto[] = [];
    for (const event of events) {
      const key = `${event.title.toLowerCase()}|${event.startsOn ?? ''}|${event.venueName ?? ''}`;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
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

    const today = new Date().toISOString().slice(0, 10);
    return records
      .map((record) => this.mapOdsEvent(record))
      .filter((event): event is CultureEventDto => event !== null)
      .filter((event) => this.isUpcomingOrOngoing(event, today));
  }

  private async fetchOpenAgendaEvents(
    apiKey: string,
  ): Promise<CultureEventDto[]> {
    const agendas = await this.listToulouseAgendas(apiKey);
    const events: CultureEventDto[] = [];
    for (const agenda of agendas.slice(0, MAX_AGENDAS)) {
      try {
        const agendaEvents = await this.listAgendaUpcomingEvents(
          apiKey,
          agenda.uid,
        );
        events.push(...agendaEvents);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`OpenAgenda agenda ${agenda.uid} failed: ${message}`);
      }
    }
    return events;
  }

  private async listToulouseAgendas(
    apiKey: string,
  ): Promise<OpenAgendaAgenda[]> {
    const params = new URLSearchParams({
      network: TOULOUSE_NETWORK_ID,
      size: String(MAX_AGENDAS),
    });
    const payload = await this.fetchJson<OpenAgendaAgendasResponse>(
      `${OPENAGENDA_API}/agendas?${params.toString()}`,
      { key: apiKey },
    );
    return payload.agendas ?? [];
  }

  private async listAgendaUpcomingEvents(
    apiKey: string,
    agendaUid: number,
  ): Promise<CultureEventDto[]> {
    const params = new URLSearchParams({
      size: String(Math.min(MAX_EVENTS_PER_AGENDA, 100)),
      monolingual: 'fr',
      'relative[]': 'upcoming',
    });
    // URLSearchParams doesn't support duplicate keys well for relative[]=current
    const query = `${params.toString()}&relative[]=current&sort=timings.asc`;
    const payload = await this.fetchJson<OpenAgendaEventsResponse>(
      `${OPENAGENDA_API}/agendas/${agendaUid}/events?${query}`,
      { key: apiKey },
    );
    return (payload.events ?? [])
      .map((event) => this.mapOpenAgendaEvent(event))
      .filter((event): event is CultureEventDto => event !== null)
      .slice(0, MAX_EVENTS_PER_AGENDA);
  }

  private mapOpenAgendaEvent(event: OpenAgendaEvent): CultureEventDto | null {
    const title = this.localizedText(event.title);
    if (!title || !event.uid) {
      return null;
    }
    const first = event.firstTiming ?? event.timings?.[0];
    const last =
      event.lastTiming ?? event.timings?.[event.timings.length - 1] ?? first;
    return {
      eventId: `oa-${event.uid}`,
      title,
      summary: this.localizedText(event.description) || null,
      startsOn: first?.begin ? first.begin.slice(0, 10) : null,
      endsOn: last?.end ? last.end.slice(0, 10) : null,
      schedule: first?.begin
        ? new Date(first.begin).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris',
          })
        : null,
      venueName: event.location?.name ?? null,
      address: event.location?.address ?? null,
      city: event.location?.city ?? null,
      category: null,
      theme: null,
      type: 'OpenAgenda',
      latitude: event.location?.latitude ?? null,
      longitude: event.location?.longitude ?? null,
      bookingUrl: event.registrationUrl || event.canonicalUrl || null,
      provider: 'openagenda',
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
    return {
      eventId: `ods-${record.identifiant || `${title}-${record.date_debut ?? 'na'}`}`,
      title,
      summary: record.descriptif_court?.trim() || null,
      startsOn: record.date_debut ?? null,
      endsOn: record.date_fin ?? null,
      schedule: record.horaires?.trim() || null,
      venueName: record.lieu_nom?.trim() || null,
      address: address || null,
      city: record.commune?.trim() || null,
      category: record.categorie_de_la_manifestation?.trim() || null,
      theme: record.theme_de_la_manifestation?.trim() || null,
      type: record.type_de_manifestation?.trim() || null,
      latitude: this.toNumber(record.googlemap_latitude),
      longitude: this.toNumber(record.googlemap_longitude),
      bookingUrl: record.reservation_site_internet?.trim() || null,
      provider: 'ods',
    };
  }

  private localizedText(
    value: string | Record<string, string> | undefined,
  ): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string') {
      return value.trim();
    }
    return (value.fr || value.en || Object.values(value)[0] || '').trim();
  }

  private isUpcomingOrOngoing(event: CultureEventDto, today: string): boolean {
    const start = event.startsOn ?? '';
    const end = event.endsOn ?? start;
    if (!start && !end) {
      return false;
    }
    return end >= today || start >= today;
  }

  private toNumber(value: number | string | null | undefined): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchJson<T>(
    url: string,
    headers: Record<string, string> = {},
  ): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
        ...headers,
      },
    });
    if (!response.ok) {
      throw new Error(`${url} → HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
