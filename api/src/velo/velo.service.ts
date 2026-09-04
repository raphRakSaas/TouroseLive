import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import {
  CatalogResponse,
  GbfsFeedIndex,
  GbfsStationInformation,
  GbfsStationStatus,
  LocalizedName,
  SnapshotStatus,
  VeloStationDto,
} from './velo.types';

const GBFS_DISCOVERY_URL =
  'https://api.cyclocity.fr/contracts/toulouse/gbfs/v3/gbfs.json';
const USER_AGENT = 'TouRose/0.1 (https://tourose.local; open-data reuse)';
const POLL_MS = 45_000;
const STALE_AFTER_MS = 5 * 60_000;

@Injectable()
export class VeloService implements OnModuleInit {
  private readonly logger = new Logger(VeloService.name);
  private stations: VeloStationDto[] = [];
  private fetchedAt: Date | null = null;
  private expiresAt: Date | null = null;
  private snapshotStatus: SnapshotStatus = 'unavailable';

  async onModuleInit(): Promise<void> {
    void this.refreshStations();
  }

  @Interval(POLL_MS)
  async pollStations(): Promise<void> {
    await this.refreshStations();
  }

  listStations(): CatalogResponse<VeloStationDto[]> {
    return this.wrap(this.stations);
  }

  getStation(stationId: string): CatalogResponse<VeloStationDto | null> {
    const station = this.stations.find((item) => item.stationId === stationId);
    return this.wrap(station ?? null);
  }

  private wrap<T>(data: T): CatalogResponse<T> {
    return {
      status: this.snapshotStatus,
      fetchedAt: this.fetchedAt?.toISOString() ?? null,
      expiresAt: this.expiresAt?.toISOString() ?? null,
      source: 'JCDecaux Cyclocity GBFS v3 / VélôToulouse',
      license: 'ODbL',
      data,
    };
  }

  private async refreshStations(): Promise<void> {
    try {
      const discovery = await this.fetchJson<GbfsFeedIndex>(GBFS_DISCOVERY_URL);
      const informationUrl = this.feedUrl(discovery, 'station_information');
      const statusUrl = this.feedUrl(discovery, 'station_status');
      if (!informationUrl || !statusUrl) {
        throw new Error('GBFS discovery is missing station feeds');
      }

      const [informationPayload, statusPayload] = await Promise.all([
        this.fetchJson<{ data: { stations: GbfsStationInformation[] } }>(
          informationUrl,
        ),
        this.fetchJson<{ data: { stations: GbfsStationStatus[] } }>(statusUrl),
      ]);

      const statusById = new Map(
        statusPayload.data.stations.map((station) => [
          station.station_id,
          station,
        ]),
      );

      this.stations = informationPayload.data.stations
        .map((information) =>
          this.mergeStation(information, statusById.get(information.station_id)),
        )
        .filter((station): station is VeloStationDto => station !== null)
        .sort((left, right) => left.name.localeCompare(right.name, 'fr'));

      this.fetchedAt = new Date();
      this.expiresAt = new Date(Date.now() + POLL_MS);
      this.snapshotStatus = 'ok';
      this.logger.log(`GBFS refresh ok (${this.stations.length} stations)`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`GBFS refresh failed: ${message}`);
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

  private mergeStation(
    information: GbfsStationInformation,
    status: GbfsStationStatus | undefined,
  ): VeloStationDto | null {
    if (!status || !status.is_installed) {
      return null;
    }
    const name = this.frenchName(information.name).trim();
    if (!name) {
      return null;
    }
    const electricalBikes = this.vehicleCount(status, 'electrical');
    const mechanicalBikes = this.vehicleCount(status, 'mechanical');
    return {
      stationId: information.station_id,
      name,
      address: information.address?.trim() || null,
      latitude: information.lat,
      longitude: information.lon,
      capacity: information.capacity ?? null,
      bikesAvailable: status.num_vehicles_available,
      docksAvailable: status.num_docks_available,
      electricalBikes,
      mechanicalBikes,
      isRenting: status.is_renting && status.is_installed,
      isInstalled: status.is_installed,
      lastReportedAt: status.last_reported,
    };
  }

  private vehicleCount(
    status: GbfsStationStatus,
    vehicleTypeId: string,
  ): number {
    const match = status.vehicle_types_available?.find(
      (item) => item.vehicle_type_id === vehicleTypeId,
    );
    return match?.count ?? 0;
  }

  private frenchName(name: LocalizedName[] | string): string {
    if (typeof name === 'string') {
      return name;
    }
    const french = name.find((item) => item.language === 'fr');
    return french?.text ?? name[0]?.text ?? 'Station';
  }

  private feedUrl(index: GbfsFeedIndex, feedName: string): string | undefined {
    return index.data.feeds.find((feed) => feed.name === feedName)?.url;
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
