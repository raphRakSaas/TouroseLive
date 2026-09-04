import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  viewChild,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  circleMarker,
  Map as LeafletMap,
  map as createMap,
  tileLayer,
} from 'leaflet';
import { CatalogResponse, ParkingLot, VeloStation } from '../../core/catalog.models';
import { ParkingApi } from '../../core/parking-api';
import { VeloApi } from '../../core/velo-api';

type MapLayer = 'all' | 'velo' | 'parking';

@Component({
  selector: 'app-map-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage implements OnDestroy {
  private readonly veloApi = inject(VeloApi);
  private readonly parkingApi = inject(ParkingApi);
  private leafletMap: LeafletMap | null = null;
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');

  protected readonly veloCatalog = signal<CatalogResponse<VeloStation[]> | null>(
    null,
  );
  protected readonly parkingCatalog = signal<CatalogResponse<
    ParkingLot[]
  > | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly mapLayer = signal<MapLayer>('all');

  protected readonly visibleStations = computed(() => {
    if (this.mapLayer() === 'parking') {
      return [];
    }
    return this.veloCatalog()?.data ?? [];
  });

  protected readonly visibleLots = computed(() => {
    if (this.mapLayer() === 'velo') {
      return [];
    }
    return this.parkingCatalog()?.data ?? [];
  });

  protected readonly topStations = computed(() => {
    const stations = this.veloCatalog()?.data ?? [];
    return [...stations]
      .sort((left, right) => right.bikesAvailable - left.bikesAvailable)
      .slice(0, 8);
  });

  protected readonly listLots = computed(() =>
    (this.parkingCatalog()?.data ?? []).slice(0, 8),
  );

  constructor() {
    this.veloApi.listStations().subscribe({
      next: (payload) => this.veloCatalog.set(payload),
      error: () => this.loadError.set('Données Vélô temporairement indisponibles.'),
    });
    this.parkingApi.listLots().subscribe({
      next: (payload) => this.parkingCatalog.set(payload),
      error: () =>
        this.loadError.set('Données parkings temporairement indisponibles.'),
    });

    effect(() => {
      const host = this.mapHost();
      const stations = this.visibleStations();
      const lots = this.visibleLots();
      if (host) {
        this.drawMap(stations, lots);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearMap();
  }

  protected setLayer(layer: MapLayer): void {
    this.mapLayer.set(layer);
  }

  protected markerTone(station: VeloStation): string {
    if (!station.isRenting || station.bikesAvailable === 0) {
      return '#8a8a8a';
    }
    if (station.bikesAvailable >= 5) {
      return '#008a05';
    }
    return '#c13515';
  }

  private drawMap(stations: VeloStation[], lots: ParkingLot[]): void {
    const host = this.mapHost()?.nativeElement;
    if (!host) {
      return;
    }
    this.clearMap();
    this.leafletMap = createMap(host).setView([43.6045, 1.444], 13);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.leafletMap);

    for (const station of stations) {
      circleMarker([station.latitude, station.longitude], {
        radius: 6,
        color: this.markerTone(station),
        fillColor: this.markerTone(station),
        fillOpacity: 0.85,
        weight: 1,
      })
        .bindPopup(
          `<a href="/velo/${station.stationId}">${station.name}</a><br>${station.bikesAvailable} vélos · ${station.docksAvailable} places`,
        )
        .addTo(this.leafletMap);
    }

    for (const lot of lots) {
      circleMarker([lot.latitude, lot.longitude], {
        radius: 8,
        color: '#222222',
        fillColor: '#222222',
        fillOpacity: 0.85,
        weight: 1,
      })
        .bindPopup(
          `<a href="/parkings/${encodeURIComponent(lot.parkingId)}">${lot.name}</a><br>${lot.capacity ?? '—'} places`,
        )
        .addTo(this.leafletMap);
    }

    window.setTimeout(() => this.leafletMap?.invalidateSize(), 0);
  }

  private clearMap(): void {
    this.leafletMap?.remove();
    this.leafletMap = null;
  }
}
