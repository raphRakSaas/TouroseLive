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
import {
  CatalogResponse,
  CultureEvent,
  ParkingLot,
  VeloStation,
} from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';
import { ParkingApi } from '../../core/parking-api';
import { VeloApi } from '../../core/velo-api';

type MapLayer = 'all' | 'velo' | 'parking' | 'events';

@Component({
  selector: 'app-map-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage implements OnDestroy {
  private readonly veloApi = inject(VeloApi);
  private readonly parkingApi = inject(ParkingApi);
  private readonly eventsApi = inject(EventsApi);
  private leafletMap: LeafletMap | null = null;
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');
  private readonly railHost = viewChild<ElementRef<HTMLDivElement>>('railHost');

  protected readonly veloCatalog = signal<CatalogResponse<VeloStation[]> | null>(
    null,
  );
  protected readonly parkingCatalog = signal<CatalogResponse<
    ParkingLot[]
  > | null>(null);
  protected readonly eventsCatalog = signal<CatalogResponse<
    CultureEvent[]
  > | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly mapLayer = signal<MapLayer>('all');
  protected readonly selectedEventId = signal<string | null>(null);

  protected readonly visibleStations = computed(() => {
    if (this.mapLayer() === 'parking' || this.mapLayer() === 'events') {
      return [];
    }
    return this.veloCatalog()?.data ?? [];
  });

  protected readonly visibleLots = computed(() => {
    if (this.mapLayer() === 'velo' || this.mapLayer() === 'events') {
      return [];
    }
    return this.parkingCatalog()?.data ?? [];
  });

  protected readonly mappedEvents = computed(() =>
    (this.eventsCatalog()?.data ?? []).filter(
      (event) => event.latitude !== null && event.longitude !== null,
    ),
  );

  protected readonly visibleEvents = computed(() => {
    if (this.mapLayer() === 'velo' || this.mapLayer() === 'parking') {
      return [];
    }
    return this.mappedEvents();
  });

  protected readonly railEvents = computed(() =>
    this.mappedEvents().slice(0, 24),
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
    this.eventsApi.listEvents().subscribe({
      next: (payload) => this.eventsCatalog.set(payload),
      error: () => this.eventsCatalog.set(null),
    });

    effect(() => {
      const host = this.mapHost();
      const stations = this.visibleStations();
      const lots = this.visibleLots();
      const events = this.visibleEvents();
      if (host) {
        this.drawMap(stations, lots, events);
      }
    });
  }

  ngOnDestroy(): void {
    this.clearMap();
  }

  protected setLayer(layer: MapLayer): void {
    this.mapLayer.set(layer);
  }

  protected selectEvent(event: CultureEvent): void {
    this.selectedEventId.set(event.eventId);
    if (
      this.leafletMap &&
      event.latitude !== null &&
      event.longitude !== null
    ) {
      this.leafletMap.setView([event.latitude, event.longitude], 15, {
        animate: true,
      });
    }
  }

  protected scrollRail(direction: -1 | 1): void {
    const host = this.railHost()?.nativeElement;
    if (!host) {
      return;
    }
    host.scrollBy({ left: direction * 280, behavior: 'smooth' });
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

  private drawMap(
    stations: VeloStation[],
    lots: ParkingLot[],
    events: CultureEvent[],
  ): void {
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

    for (const event of events) {
      if (event.latitude === null || event.longitude === null) {
        continue;
      }
      circleMarker([event.latitude, event.longitude], {
        radius: 7,
        color: '#e8527a',
        fillColor: '#e8527a',
        fillOpacity: 0.9,
        weight: 1,
      })
        .bindPopup(
          `<a href="/evenements/${event.eventId}">${event.title}</a><br>${event.venueName ?? ''}`,
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
