import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  CatalogResponse,
  OdsExploreResponse,
  OdsParkingRecord,
  ParkingKind,
  ParkingLotDto,
  SnapshotStatus,
} from './parking.types';

const ODS_BASE =
  'https://data.toulouse-metropole.fr/api/explore/v2.1/catalog/datasets';
const OUVRAGE_URL = `${ODS_BASE}/parcs-de-stationnement/records?limit=100`;
const RELAIS_URL = `${ODS_BASE}/parkings-relais/records?limit=100`;
const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const POLL_MS = 60 * 60_000;
const STALE_AFTER_MS = 24 * 60 * 60_000;

@Injectable()
export class ParkingService implements OnModuleInit {
  private readonly logger = new Logger(ParkingService.name);
  private lots: ParkingLotDto[] = [];
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';

  async onModuleInit(): Promise<void> {
    await this.refreshLots();
  }

  @Interval(POLL_MS)
  async pollLots(): Promise<void> {
    await this.refreshLots();
  }

  listLots(): CatalogResponse<ParkingLotDto[]> {
    return this.wrap(this.lots);
  }

  getLot(parkingId: string): CatalogResponse<ParkingLotDto | null> {
    const lot = this.lots.find((item) => item.parkingId === parkingId);
    return this.wrap(lot ?? null);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source: 'Toulouse Métropole Open Data / parcs-de-stationnement + parkings-relais',
      license: 'Licence Ouverte / Etalab',
      data,
    };
  }

  private async refreshLots(): Promise<void> {
    try {
      const [ouvrages, relais] = await Promise.all([
        this.fetchJson<OdsExploreResponse<OdsParkingRecord>>(OUVRAGE_URL),
        this.fetchJson<OdsExploreResponse<OdsParkingRecord>>(RELAIS_URL),
      ]);

      const merged = new Map<string, ParkingLotDto>();
      for (const record of ouvrages.results) {
        const lot = this.mapRecord(record, 'ouvrage');
        if (lot) {
          merged.set(lot.parkingId, lot);
        }
      }
      for (const record of relais.results) {
        const lot = this.mapRecord(record, 'relais');
        if (lot) {
          merged.set(lot.parkingId, lot);
        }
      }

      this.lots = [...merged.values()].sort((left, right) =>
        left.name.localeCompare(right.name, 'fr'),
      );
      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      this.logger.log(`ODS parking refresh ok (${this.lots.length} lots)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ODS parking refresh failed: ${message}`);
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

  private mapRecord(
    record: OdsParkingRecord,
    kind: ParkingKind,
  ): ParkingLotDto | null {
    const latitude = record.geo_point_2d?.lat ?? record.ylat ?? null;
    const longitude = record.geo_point_2d?.lon ?? record.xlong ?? null;
    if (latitude === null || longitude === null || !record.id || !record.nom) {
      return null;
    }
    return {
      parkingId: record.id,
      name: record.nom,
      address: record.adresse ?? null,
      city: record.commune ?? null,
      latitude,
      longitude,
      capacity: record.nb_places ?? null,
      kind,
      isFree: record.gratuit === 'T',
      hourlyRate: this.nullableRate(record.tarif_1h),
      dailyRate: this.nullableRate(record.tarif_24h),
      operator: record.gestionnaire ?? null,
      occupancyAvailable: false,
    };
  }

  private nullableRate(value: number | null | undefined): number | null {
    if (value === null || value === undefined) {
      return null;
    }
    return value;
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
