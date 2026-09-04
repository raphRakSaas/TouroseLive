import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PlaceMediaResolver } from '../common/place-media';
import {
  CatalogResponse,
  OdsExploreResponse,
  OdsGeoPoint,
  PlaceDto,
  PlaceKind,
  SnapshotStatus,
} from './places.types';

const ODS_BASE =
  'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets';
const USER_AGENT =
  'TouRose/0.1 (https://github.com/raphRakSaas/TouroseLive; open-data reuse)';
const POLL_MS = 12 * 60 * 60_000;
const STALE_AFTER_MS = 48 * 60 * 60_000;
const MEDIA_CONCURRENCY = 1;
const PHOTO_CACHE_PATH = path.join(process.cwd(), '.cache', 'place-photos.json');

type PhotoCacheEntry = {
  imageUrl: string;
  imageSource: PlaceDto['imageSource'];
};

type RawRecord = Record<string, unknown>;

@Injectable()
export class PlacesService implements OnModuleInit {
  private readonly logger = new Logger(PlacesService.name);
  private places: PlaceDto[] = [];
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';
  private readonly mediaResolver = new PlaceMediaResolver();

  async onModuleInit(): Promise<void> {
    // Don't block Nest listen() while Wikimedia enrichment runs.
    void this.refreshPlaces();
  }

  @Interval(POLL_MS)
  async pollPlaces(): Promise<void> {
    await this.refreshPlaces();
  }

  listPlaces(kind?: string): CatalogResponse<PlaceDto[]> {
    if (!kind || kind === 'all') {
      return this.wrap(this.places);
    }
    const filtered = this.places.filter((place) => place.kind === kind);
    return this.wrap(filtered);
  }

  getPlace(placeId: string): CatalogResponse<PlaceDto | null> {
    const found =
      this.places.find((place) => place.placeId === placeId) ?? null;
    return this.wrap(found);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source:
        'Toulouse Métropole Open Data + photos Wikidata / Wikipedia / Wikimedia Commons',
      license: 'Licence Ouverte / ODbL (Mérimée) / CC Wikimedia',
      data,
    };
  }

  private async refreshPlaces(): Promise<void> {
    try {
      const [
        museums,
        galleries,
        theatres,
        playgrounds,
        gardens,
        walks,
        heritage,
      ] = await Promise.all([
        this.fetchAll(`${ODS_BASE}/musees/records`, 100),
        this.fetchAll(
          `${ODS_BASE}/galeries-d-art-et-lieux-d-exposition/records`,
          100,
        ),
        this.fetchAll(
          `${ODS_BASE}/theatres-et-salles-de-spectacles/records`,
          100,
        ),
        this.fetchAll(`${ODS_BASE}/aires-de-jeux/records`, 100, 3),
        this.fetchAll(`${ODS_BASE}/jardins-partages/records`, 100),
        this.fetchAll(`${ODS_BASE}/balade/records`, 100),
        this.fetchAll(
          `${ODS_BASE}/base-merimee/records?where=${encodeURIComponent(
            "chpinsee='31555' AND (chpprot LIKE 'classé%' OR chpprot LIKE 'inscrit%')",
          )}`,
          100,
          3,
        ),
      ]);

      const merged = [
        ...museums
          .map((record) => this.mapEquipment(record, 'museum'))
          .filter((place): place is PlaceDto => place !== null),
        ...galleries
          .map((record) => this.mapGallery(record))
          .filter((place): place is PlaceDto => place !== null),
        ...theatres
          .map((record) => this.mapEquipment(record, 'theatre'))
          .filter((place): place is PlaceDto => place !== null),
        ...playgrounds
          .map((record) => this.mapPlayground(record))
          .filter((place): place is PlaceDto => place !== null),
        ...gardens
          .map((record) => this.mapGarden(record))
          .filter((place): place is PlaceDto => place !== null),
        ...walks
          .map((record) => this.mapWalk(record))
          .filter((place): place is PlaceDto => place !== null),
        ...heritage
          .map((record) => this.mapHeritage(record))
          .filter((place): place is PlaceDto => place !== null),
      ].sort((left, right) => left.name.localeCompare(right.name, 'fr'));

      // Keep previously resolved photos (memory + disk), then fill missing ones.
      const diskPhotos = await this.loadPhotoCache();
      const previousById = new Map(
        this.places.map((place) => [place.placeId, place] as const),
      );
      const withCachedPhotos = merged.map((place) => {
        const previous = previousById.get(place.placeId);
        if (previous?.imageUrl) {
          return {
            ...place,
            imageUrl: previous.imageUrl,
            imageSource: previous.imageSource,
          };
        }
        const disk = diskPhotos.get(place.placeId);
        if (disk?.imageUrl) {
          return {
            ...place,
            imageUrl: disk.imageUrl,
            imageSource: disk.imageSource,
          };
        }
        return place;
      });

      this.places = withCachedPhotos;
      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      const cachedPhotos = withCachedPhotos.filter((place) => place.imageUrl)
        .length;
      this.logger.log(
        `Places catalog ready (${withCachedPhotos.length}, cached photos=${cachedPhotos}), resolving missing…`,
      );

      void this.enrichImages(withCachedPhotos);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Places refresh failed: ${message}`);
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

  private async enrichImages(places: PlaceDto[]): Promise<void> {
    const working = places.map((place) => ({ ...place }));
    const pending = working
      .map((place, index) => ({ place, index }))
      .filter(({ place }) => !place.imageUrl)
      .sort(
        (left, right) =>
          this.mediaPriority(left.place.kind) -
          this.mediaPriority(right.place.kind),
      );

    if (pending.length === 0) {
      this.logger.log(`Places photos already cached (${working.length})`);
      return;
    }

    let cursor = 0;
    let resolvedCount = 0;

    const publish = async (): Promise<void> => {
      this.places = working.map((place) => ({ ...place }));
      this.fetchedAt = new Date();
      await this.savePhotoCache(working);
    };

    const worker = async (): Promise<void> => {
      while (cursor < pending.length) {
        const waitMs = this.mediaResolver.cooldownRemainingMs();
        if (waitMs > 0) {
          this.logger.warn(
            `Waiting ${Math.ceil(waitMs / 1000)}s for Wikimedia rate-limit cooldown`,
          );
          await new Promise((resolve) => setTimeout(resolve, waitMs + 250));
        }
        const current = pending[cursor];
        cursor += 1;
        const { place, index } = current;
        try {
          const media = await this.mediaResolver.resolve(place.name, place.kind);
          working[index] = media
            ? {
                ...place,
                imageUrl: media.imageUrl,
                imageSource: media.imageSource,
              }
            : { ...place, imageUrl: null, imageSource: null };
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          this.logger.debug(`Media resolve failed for ${place.name}: ${message}`);
          working[index] = { ...place, imageUrl: null, imageSource: null };
          if (/429|rate limit/i.test(message)) {
            const pauseMs = Math.max(
              8_000,
              this.mediaResolver.cooldownRemainingMs(),
            );
            this.logger.warn(
              `Rate-limited on ${place.name}; pausing ${Math.ceil(pauseMs / 1000)}s then continuing`,
            );
            await new Promise((resolve) => setTimeout(resolve, pauseMs));
          }
        }

        resolvedCount += 1;
        // Publish early so the home grid can show photos without waiting for all.
        if (resolvedCount <= 24 || resolvedCount % 8 === 0) {
          await publish();
        }
      }
    };

    await Promise.all(
      Array.from({ length: MEDIA_CONCURRENCY }, () => worker()),
    );
    await publish();
    const withPhoto = working.filter((place) => place.imageUrl).length;
    this.logger.log(
      `Places photos ready (${working.length}, photos=${withPhoto})`,
    );
  }

  private async loadPhotoCache(): Promise<Map<string, PhotoCacheEntry>> {
    try {
      const raw = await fs.readFile(PHOTO_CACHE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as Record<string, PhotoCacheEntry>;
      return new Map(Object.entries(parsed));
    } catch {
      return new Map();
    }
  }

  private async savePhotoCache(places: PlaceDto[]): Promise<void> {
    const entries: Record<string, PhotoCacheEntry> = {};
    for (const place of places) {
      if (place.imageUrl) {
        entries[place.placeId] = {
          imageUrl: place.imageUrl,
          imageSource: place.imageSource,
        };
      }
    }
    try {
      await fs.mkdir(path.dirname(PHOTO_CACHE_PATH), { recursive: true });
      await fs.writeFile(
        PHOTO_CACHE_PATH,
        JSON.stringify(entries, null, 0),
        'utf8',
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`Could not save place photo cache: ${message}`);
    }
  }

  private mediaPriority(kind: PlaceKind): number {
    const order: PlaceKind[] = [
      'museum',
      'heritage',
      'theatre',
      'gallery',
      'garden',
      'walk',
      'playground',
    ];
    const rank = order.indexOf(kind);
    return rank === -1 ? 99 : rank;
  }

  private emptyImages(): Pick<PlaceDto, 'imageUrl' | 'imageSource'> {
    return { imageUrl: null, imageSource: null };
  }

  private mapEquipment(
    record: RawRecord,
    kind: 'museum' | 'theatre',
  ): PlaceDto | null {
    const name = this.asString(record.eq_nom_equipement);
    if (!name) {
      return null;
    }
    const point = this.geo(record);
    return {
      placeId: `${kind}-${this.asString(record.oid) || name}`,
      kind,
      name,
      address: this.asString(record.lib_off),
      city: this.asString(record.eq_ville) || 'Toulouse',
      district: this.asString(record.eq_quartier),
      description: this.asString(record.eq_gestionnaire),
      website: this.asString(record.eq_site_web),
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      protection: null,
      ...this.emptyImages(),
    };
  }

  private mapGallery(record: RawRecord): PlaceDto | null {
    const name = this.asString(record.nom_equipement);
    if (!name) {
      return null;
    }
    const point = this.geo(record);
    return {
      placeId: `gallery-${name}`,
      kind: 'gallery',
      name,
      address: this.asString(record.lib_off),
      city: this.asString(record.ville) || 'Toulouse',
      district: this.asString(record.quartier),
      description: this.asString(record.gestionnaire),
      website: this.asString(record.site_web),
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      protection: null,
      ...this.emptyImages(),
    };
  }

  private mapPlayground(record: RawRecord): PlaceDto | null {
    const name = this.asString(record.nom);
    if (!name) {
      return null;
    }
    const point = this.geo(record);
    const age = this.asString(record.code_age_jeux);
    const games = record.nombre_jeux;
    return {
      placeId: `playground-${this.asString(record.id_aires_jeux) || name}`,
      kind: 'playground',
      name,
      address: this.asString(record.adresse),
      city: this.asString(record.commune) || 'Toulouse',
      district: this.asString(record.territoire),
      description: [age, games ? `${games} jeux` : null]
        .filter(Boolean)
        .join(' · ') || null,
      website: null,
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      protection: null,
      ...this.emptyImages(),
    };
  }

  private mapGarden(record: RawRecord): PlaceDto | null {
    const name = this.asString(record.nom);
    if (!name) {
      return null;
    }
    const point = this.geo(record);
    return {
      placeId: `garden-${this.asString(record.id) || name}`,
      kind: 'garden',
      name,
      address: this.asString(record.adresse),
      city: this.asString(record.commune) || 'Toulouse',
      district: null,
      description: this.asString(record.description),
      website: this.asString(record.site_internet),
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      protection: null,
      ...this.emptyImages(),
    };
  }

  private mapWalk(record: RawRecord): PlaceDto | null {
    const name = this.asString(record.nom);
    if (!name) {
      return null;
    }
    const point = this.geo(record);
    const duration = this.asString(record.duree);
    const distance = record.distance;
    return {
      placeId: `walk-${this.asString(record.id) || name}`,
      kind: 'walk',
      name,
      address: this.asString(record.lieu),
      city: 'Toulouse Métropole',
      district: null,
      description: [duration, distance ? `${distance} km` : null]
        .filter(Boolean)
        .join(' · ') || null,
      website: this.asString(record.lien),
      latitude: point?.lat ?? null,
      longitude: point?.lon ?? null,
      protection: null,
      ...this.emptyImages(),
    };
  }

  private mapHeritage(record: RawRecord): PlaceDto | null {
    const name =
      this.asString(record.chptico) || this.asString(record.chpdeno) || '';
    if (!name) {
      return null;
    }
    const coords = this.asString(record.chpcoorwgs84);
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (coords?.includes(',')) {
      const [latText, lonText] = coords.split(',').map((part) => part.trim());
      latitude = this.toNumber(latText);
      longitude = this.toNumber(lonText);
    }
    return {
      placeId: `heritage-${this.asString(record.chpuser) || name}`,
      kind: 'heritage',
      name,
      address: this.asString(record.chpadrs),
      city: this.asString(record.chpcom) || 'Toulouse',
      district: this.asString(record.chplieu),
      description: this.asString(record.chphist)?.slice(0, 280) || null,
      website: null,
      latitude,
      longitude,
      protection: this.asString(record.chpprot),
      ...this.emptyImages(),
    };
  }

  private geo(record: RawRecord): OdsGeoPoint | null {
    const point = record.geo_point_2d as OdsGeoPoint | undefined;
    if (point?.lat !== undefined && point?.lon !== undefined) {
      return point;
    }
    return null;
  }

  private asString(value: unknown): string | null {
    if (typeof value !== 'string') {
      return value === null || value === undefined ? null : String(value);
    }
    const trimmed = value.trim();
    return trimmed || null;
  }

  private toNumber(value: string | null): number | null {
    if (!value) {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  private async fetchAll(
    url: string,
    pageSize: number,
    maxPages = 5,
  ): Promise<RawRecord[]> {
    const records: RawRecord[] = [];
    for (let page = 0; page < maxPages; page += 1) {
      const separator = url.includes('?') ? '&' : '?';
      const pageUrl = `${url}${separator}limit=${pageSize}&offset=${page * pageSize}`;
      const payload = await this.fetchJson<OdsExploreResponse<RawRecord>>(pageUrl);
      records.push(...payload.results);
      if (page * pageSize + payload.results.length >= payload.total_count) {
        break;
      }
    }
    return records;
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
    });
    if (!response.ok) {
      throw new Error(`${url} → HTTP ${response.status}`);
    }
    return (await response.json()) as T;
  }
}

export const PLACE_KINDS: PlaceKind[] = [
  'museum',
  'gallery',
  'theatre',
  'playground',
  'garden',
  'walk',
  'heritage',
];
