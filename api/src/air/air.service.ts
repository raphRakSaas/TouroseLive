import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  AirIndexDto,
  AtmoFeatureAttributes,
  AtmoQueryResponse,
  CatalogResponse,
  SnapshotStatus,
} from './air.types';

const ZONE_CODE = '243100518';
const ZONE_LABEL = 'Toulouse Métropole';
const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const POLL_MS = 12 * 60 * 60_000;
const STALE_AFTER_MS = 36 * 60 * 60_000;

const ATMO_QUERY_URL =
  "https://services9.arcgis.com/7Sr9Ek9c1QTKmbwr/arcgis/rest/services/Indice_quotidien_de_qualité_de_l’air_pour_les_collectivités_territoriales_en_Occitanie/FeatureServer/0/query";

const POLLUTANT_LABELS: Record<string, string> = {
  o3: 'O₃',
  no2: 'NO₂',
  pm10: 'PM10',
  pm25: 'PM2.5',
  so2: 'SO₂',
};

@Injectable()
export class AirService implements OnModuleInit {
  private readonly logger = new Logger(AirService.name);
  private index: AirIndexDto | null = null;
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';

  async onModuleInit(): Promise<void> {
    await this.refreshIndex();
  }

  @Interval(POLL_MS)
  async pollIndex(): Promise<void> {
    await this.refreshIndex();
  }

  getIndex(): CatalogResponse<AirIndexDto | null> {
    return this.wrap(this.index);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source: 'Atmo Occitanie FeatureServer (ind_occitanie)',
      license: 'ODbL',
      data,
    };
  }

  private async refreshIndex(): Promise<void> {
    try {
      const params = new URLSearchParams({
        where: `code_zone='${ZONE_CODE}'`,
        outFields:
          'date_ech,code_qual,lib_qual,coul_qual,code_no2,code_o3,code_pm10,code_pm25,code_so2,lib_zone,source',
        orderByFields: 'date_ech DESC',
        resultRecordCount: '1',
        f: 'json',
      });
      const response = await fetch(`${ATMO_QUERY_URL}?${params.toString()}`, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`ATMO → HTTP ${response.status}`);
      }
      const payload = (await response.json()) as AtmoQueryResponse;
      const attributes = payload.features?.[0]?.attributes;
      if (!attributes) {
        throw new Error('ATMO returned no features for Toulouse Métropole');
      }

      this.index = this.mapIndex(attributes);
      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      this.logger.log(
        `ATMO refresh ok (${this.index.qualityLabel} · ${this.index.observedOn})`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`ATMO refresh failed: ${message}`);
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

  private mapIndex(attributes: AtmoFeatureAttributes): AirIndexDto {
    const pollutants = {
      no2: attributes.code_no2 ?? null,
      o3: attributes.code_o3 ?? null,
      pm10: attributes.code_pm10 ?? null,
      pm25: attributes.code_pm25 ?? null,
      so2: attributes.code_so2 ?? null,
    };
    const dominantPollutant = this.dominantPollutant(pollutants);
    const qualityCode = attributes.code_qual ?? 0;
    return {
      zoneCode: ZONE_CODE,
      zoneLabel: attributes.lib_zone || ZONE_LABEL,
      observedOn: new Date(attributes.date_ech).toISOString().slice(0, 10),
      qualityCode,
      qualityLabel: attributes.lib_qual || 'Indisponible',
      qualityColor: attributes.coul_qual || '#8a8a8a',
      dominantPollutant,
      pollutants,
      advice: this.advice(qualityCode, dominantPollutant),
      source: attributes.source || 'Atmo-Occitanie',
    };
  }

  private dominantPollutant(
    pollutants: AirIndexDto['pollutants'],
  ): string | null {
    let bestKey: string | null = null;
    let bestValue = 0;
    for (const [key, value] of Object.entries(pollutants)) {
      if (value !== null && value > bestValue) {
        bestValue = value;
        bestKey = key;
      }
    }
    return bestKey ? POLLUTANT_LABELS[bestKey] ?? bestKey : null;
  }

  private advice(qualityCode: number, pollutant: string | null): string | null {
    if (qualityCode <= 0) {
      return null;
    }
    const pollutantHint = pollutant ? ` (polluant max : ${pollutant})` : '';
    if (qualityCode <= 2) {
      return `Air correct pour sortir ou pédaler${pollutantHint}.`;
    }
    if (qualityCode === 3) {
      return `Air dégradé${pollutantHint} : activité outdoor OK, attention aux personnes sensibles.`;
    }
    if (qualityCode === 4) {
      return `Air mauvais${pollutantHint} : réduire les efforts prolongés dehors si tu es sensible.`;
    }
    return `Air très dégradé${pollutantHint} : privilégier les déplacements protégés / efforts modérés.`;
  }
}
