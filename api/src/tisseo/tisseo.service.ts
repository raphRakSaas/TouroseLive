import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  AlertSeverity,
  CatalogResponse,
  GtfsRtAlert,
  GtfsRtFeedMessage,
  GtfsRtTranslatedString,
  SnapshotStatus,
  TisseoAlertDto,
} from './tisseo.types';

const ALERT_JSON_URL = 'https://api.tisseo.fr/opendata/gtfsrt/Alert.json';
const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const POLL_MS = 60_000;
const STALE_AFTER_MS = 15 * 60_000;

@Injectable()
export class TisseoService implements OnModuleInit {
  private readonly logger = new Logger(TisseoService.name);
  private alerts: TisseoAlertDto[] = [];
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';

  async onModuleInit(): Promise<void> {
    void this.refreshAlerts();
  }

  @Interval(POLL_MS)
  async pollAlerts(): Promise<void> {
    await this.refreshAlerts();
  }

  listAlerts(): CatalogResponse<TisseoAlertDto[]> {
    return this.wrap(this.alerts);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source: 'Tisséo GTFS-RT Alert.json',
      license: 'ODbL',
      data,
    };
  }

  private async refreshAlerts(): Promise<void> {
    try {
      const response = await fetch(ALERT_JSON_URL, {
        headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`Alert.json → HTTP ${response.status}`);
      }
      const payload = (await response.json()) as GtfsRtFeedMessage;
      this.alerts = (payload.entity ?? [])
        .map((entity) => this.mapAlert(entity.id, entity.alert))
        .filter((alert): alert is TisseoAlertDto => alert !== null)
        .sort((left, right) => {
          const severityRank = { severe: 0, warning: 1, info: 2 };
          return severityRank[left.severity] - severityRank[right.severity];
        });
      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      this.logger.log(`Tisséo alerts refresh ok (${this.alerts.length})`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Tisséo alerts refresh failed: ${message}`);
      if (
        this.fetchedAt &&
        Date.now() - this.fetchedAt.getTime() < STALE_AFTER_MS
      ) {
        this.snapshotStatus = 'stale';
      } else {
        this.snapshotStatus = 'unavailable';
        this.alerts = [];
      }
    }
  }

  private mapAlert(
    alertId: string,
    alert: GtfsRtAlert | undefined,
  ): TisseoAlertDto | null {
    if (!alert) {
      return null;
    }
    const header = this.plainText(this.pickTranslation(alert.header_text));
    if (!header) {
      return null;
    }
    const summary = this.plainText(
      this.pickTranslation(alert.description_text),
    );
    const period = alert.active_period?.[0];
    return {
      alertId,
      header,
      summary: summary.slice(0, 280),
      severity: this.mapSeverity(alert.effect),
      effectCode: alert.effect ?? null,
      causeCode: alert.cause ?? null,
      routeIds: (alert.informed_entity ?? [])
        .map((entity) => entity.route_id)
        .filter((routeId): routeId is string => Boolean(routeId)),
      url: this.pickTranslation(alert.url) || null,
      activeFrom: period?.start
        ? new Date(period.start * 1000).toISOString()
        : null,
      activeUntil: period?.end
        ? new Date(period.end * 1000).toISOString()
        : null,
    };
  }

  private mapSeverity(effect: number | undefined): AlertSeverity {
    // GTFS-RT Effect: 2 NO_SERVICE, 3 REDUCED_SERVICE, 4 SIGNIFICANT_DELAYS, 5 DETOUR…
    if (effect === 2 || effect === 3 || effect === 4) {
      return 'severe';
    }
    if (effect === 5 || effect === 7 || effect === 9) {
      return 'warning';
    }
    return 'info';
  }

  private pickTranslation(value?: GtfsRtTranslatedString): string {
    const translations = value?.translation ?? [];
    const french = translations.find((item) => item.language === 'fr');
    return french?.text ?? translations[0]?.text ?? '';
  }

  private plainText(value: string): string {
    return value
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
