import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  OnInit,
  signal,
  viewChild,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  circleMarker,
  CircleMarker,
  LatLngExpression,
  LayerGroup,
  Map as LeafletMap,
  map as createMap,
  tileLayer,
} from 'leaflet';
import {
  CatalogResponse,
  CultureEvent,
  ParkingLot,
  Place,
  PlaceKind,
  VeloStation,
} from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';
import { ParkingApi } from '../../core/parking-api';
import { PlacesApi } from '../../core/places-api';
import { VeloApi } from '../../core/velo-api';
import { frenchTitleCase } from '../../core/french-title-case';
import { mapPreviewUrl } from '../../core/map-preview';
import {
  veloCanReturn,
  veloOccupiedDocks,
  veloOccupancyRatio,
  veloReportedAgo,
} from '../../core/velo-station.utils';

type MapLayer = 'velo' | 'parking' | 'events' | 'places';
type PlaceKindFilter = PlaceKind | 'all';
type VeloQuickFilter = 'all' | 'low-bikes' | 'free-docks' | 'electrical' | 'can-return';
type ParkingQuickFilter = 'all' | 'free';
type EventQuickFilter = 'all' | 'week' | 'photo';

type MapSelection =
  | { type: 'velo'; station: VeloStation }
  | { type: 'parking'; lot: ParkingLot }
  | { type: 'event'; event: CultureEvent }
  | { type: 'place'; place: Place };

type SearchHit = {
  id: string;
  type: MapSelection['type'];
  label: string;
  sub: string;
  latitude: number;
  longitude: number;
  payload: MapSelection;
};

@Component({
  selector: 'app-map-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './map-page.html',
  styleUrl: './map-page.scss',
})
export class MapPage implements OnDestroy, OnInit {
  private readonly veloApi = inject(VeloApi);
  private readonly parkingApi = inject(ParkingApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly placesApi = inject(PlacesApi);
  private readonly zone = inject(NgZone);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private leafletMap: LeafletMap | null = null;
  private markerLayer: LayerGroup | null = null;
  private readonly mapHost = viewChild<ElementRef<HTMLDivElement>>('mapHost');
  private readonly railHost = viewChild<ElementRef<HTMLDivElement>>('railHost');
  private userMarker: CircleMarker | null = null;

  protected readonly veloCatalog = signal<CatalogResponse<VeloStation[]> | null>(
    null,
  );
  protected readonly parkingCatalog = signal<CatalogResponse<
    ParkingLot[]
  > | null>(null);
  protected readonly eventsCatalog = signal<CatalogResponse<
    CultureEvent[]
  > | null>(null);
  protected readonly placesCatalog = signal<CatalogResponse<Place[]> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);
  protected readonly locating = signal(false);
  protected readonly locateError = signal<string | null>(null);

  protected readonly mapLayer = signal<MapLayer>('events');
  protected readonly placeKindFilter = signal<PlaceKindFilter>('all');
  protected readonly veloQuickFilter = signal<VeloQuickFilter>('all');
  protected readonly parkingQuickFilter = signal<ParkingQuickFilter>('all');
  protected readonly eventQuickFilter = signal<EventQuickFilter>('all');
  protected readonly searchQuery = signal('');
  protected readonly selection = signal<MapSelection | null>(null);
  protected readonly filtersOpen = signal(false);

  protected readonly placeKinds: Array<{ id: PlaceKindFilter; label: string }> =
    [
      { id: 'all', label: 'Tous' },
      { id: 'museum', label: 'Musées' },
      { id: 'heritage', label: 'Patrimoine' },
      { id: 'gallery', label: 'Galeries' },
      { id: 'theatre', label: 'Théâtres' },
      { id: 'garden', label: 'Jardins' },
      { id: 'walk', label: 'Balades' },
      { id: 'playground', label: 'Jeux' },
    ];

  protected readonly mappedEvents = computed(() => {
    const today = this.parisToday();
    return (this.eventsCatalog()?.data ?? []).filter((event) => {
      if (event.latitude === null || event.longitude === null) {
        return false;
      }
      const end = event.endsOn ?? event.startsOn ?? '';
      return Boolean(end) && end >= today;
    });
  });

  protected readonly mappedPlaces = computed(() =>
    (this.placesCatalog()?.data ?? []).filter(
      (place) => place.latitude !== null && place.longitude !== null,
    ),
  );

  protected readonly visibleStations = computed(() => {
    if (this.mapLayer() !== 'velo') {
      return [];
    }
    let stations = this.veloCatalog()?.data ?? [];
    const quick = this.veloQuickFilter();
    if (quick === 'low-bikes') {
      stations = stations.filter(
        (station) => station.isRenting && station.bikesAvailable > 0 && station.bikesAvailable < 5,
      );
    } else if (quick === 'free-docks') {
      stations = stations.filter(
        (station) =>
          (station.isReturning !== false) && station.docksAvailable >= 5,
      );
    } else if (quick === 'electrical') {
      stations = stations.filter(
        (station) => station.isRenting && station.electricalBikes > 0,
      );
    } else if (quick === 'can-return') {
      stations = stations.filter(
        (station) =>
          station.isReturning !== false && station.docksAvailable > 0,
      );
    }
    return stations;
  });

  protected readonly visibleLots = computed(() => {
    if (this.mapLayer() !== 'parking') {
      return [];
    }
    let lots = this.parkingCatalog()?.data ?? [];
    if (this.parkingQuickFilter() === 'free') {
      lots = lots.filter((lot) => lot.isFree);
    }
    return lots;
  });

  protected readonly visibleEvents = computed(() => {
    if (this.mapLayer() !== 'events') {
      return [];
    }
    let events = this.mappedEvents();
    const quick = this.eventQuickFilter();
    if (quick === 'week') {
      const limit = this.addDays(this.parisToday(), 7);
      events = events.filter((event) => {
        const start = event.startsOn ?? event.endsOn ?? '';
        return start !== '' && start <= limit;
      });
    } else if (quick === 'photo') {
      events = events.filter((event) => Boolean(event.imageUrl));
    }
    return events;
  });

  protected readonly visiblePlaces = computed(() => {
    if (this.mapLayer() !== 'places') {
      return [];
    }
    let places = this.mappedPlaces();
    const kind = this.placeKindFilter();
    if (kind !== 'all') {
      places = places.filter((place) => place.kind === kind);
    }
    return [...places].sort((left, right) => {
      const leftPhoto = left.imageUrl ? 0 : 1;
      const rightPhoto = right.imageUrl ? 0 : 1;
      if (leftPhoto !== rightPhoto) {
        return leftPhoto - rightPhoto;
      }
      return left.name.localeCompare(right.name, 'fr');
    });
  });

  protected readonly trustUpdatedAt = computed(() => {
    const stamps = [
      this.veloCatalog()?.fetchedAt,
      this.parkingCatalog()?.fetchedAt,
      this.eventsCatalog()?.fetchedAt,
      this.placesCatalog()?.fetchedAt,
    ].filter((value): value is string => Boolean(value));
    if (stamps.length === 0) {
      return null;
    }
    return [...stamps].sort().at(-1) ?? null;
  });

  protected readonly pulse = computed(() => {
    const stations = this.veloCatalog()?.data ?? [];
    const bikes = stations.reduce(
      (total, station) => total + station.bikesAvailable,
      0,
    );
    const emptyStations = stations.filter(
      (station) => station.bikesAvailable === 0,
    ).length;
    const freeParkings = (this.parkingCatalog()?.data ?? []).filter(
      (lot) => lot.isFree,
    ).length;
    return {
      bikes,
      stations: stations.length,
      emptyStations,
      parkings: this.parkingCatalog()?.data.length ?? 0,
      freeParkings,
      events: this.mappedEvents().length,
      places: this.mappedPlaces().length,
    };
  });

  protected readonly searchHits = computed(() => {
    const query = this.normalize(this.searchQuery());
    if (query.length < 2) {
      return [] as SearchHit[];
    }
    const hits: SearchHit[] = [];

    for (const station of this.veloCatalog()?.data ?? []) {
      const haystack = this.normalize(
        `${station.name} ${station.address ?? ''}`,
      );
      if (!haystack.includes(query)) {
        continue;
      }
      hits.push({
        id: `velo-${station.stationId}`,
        type: 'velo',
        label: frenchTitleCase(station.name),
        sub: `${station.bikesAvailable} vélos · ${station.docksAvailable} places`,
        latitude: station.latitude,
        longitude: station.longitude,
        payload: { type: 'velo', station },
      });
    }

    for (const lot of this.parkingCatalog()?.data ?? []) {
      const haystack = this.normalize(
        `${lot.name} ${lot.address ?? ''} ${lot.city ?? ''}`,
      );
      if (!haystack.includes(query)) {
        continue;
      }
      hits.push({
        id: `parking-${lot.parkingId}`,
        type: 'parking',
        label: lot.name,
        sub: lot.isFree
          ? 'Gratuit'
          : `${lot.capacity ?? '—'} places · ${lot.city ?? 'Toulouse'}`,
        latitude: lot.latitude,
        longitude: lot.longitude,
        payload: { type: 'parking', lot },
      });
    }

    for (const event of this.mappedEvents()) {
      const haystack = this.normalize(
        `${event.title} ${event.venueName ?? ''} ${event.city ?? ''}`,
      );
      if (!haystack.includes(query)) {
        continue;
      }
      hits.push({
        id: `event-${event.eventId}`,
        type: 'event',
        label: event.title,
        sub: event.venueName || event.city || 'Toulouse',
        latitude: event.latitude!,
        longitude: event.longitude!,
        payload: { type: 'event', event },
      });
    }

    for (const place of this.mappedPlaces()) {
      const haystack = this.normalize(
        `${place.name} ${place.address ?? ''} ${place.kind}`,
      );
      if (!haystack.includes(query)) {
        continue;
      }
      hits.push({
        id: `place-${place.placeId}`,
        type: 'place',
        label: place.name,
        sub: this.placeKindLabel(place.kind),
        latitude: place.latitude!,
        longitude: place.longitude!,
        payload: { type: 'place', place },
      });
    }

    return hits.slice(0, 12);
  });

  protected readonly railTitle = computed(() => {
    switch (this.mapLayer()) {
      case 'velo':
        return 'Stations utiles';
      case 'parking':
        return 'Parkings utiles';
      case 'places':
        return 'Lieux à explorer';
      case 'events':
        return 'Événements à venir';
    }
  });

  protected readonly railItems = computed(() => {
    const layer = this.mapLayer();
    if (layer === 'velo') {
      const stations = [...(this.veloCatalog()?.data ?? [])].filter(
        (station) => station.isRenting,
      );
      const scored = stations
        .map((station) => {
          let score = 0;
          if (station.electricalBikes > 0) {
            score += 4;
          }
          if (station.bikesAvailable > 0 && station.bikesAvailable < 5) {
            score += 3;
          }
          if (station.bikesAvailable >= 5) {
            score += 2;
          }
          if (station.isReturning !== false && station.docksAvailable > 0) {
            score += 2;
          }
          if (station.bikesAvailable === 0) {
            score -= 1;
          }
          return { station, score };
        })
        .sort((left, right) => right.score - left.score || left.station.name.localeCompare(right.station.name, 'fr'))
        .slice(0, 16)
        .map(({ station }) => ({
          id: station.stationId,
          title: frenchTitleCase(station.name),
          meta: `${station.bikesAvailable} vélos · ${station.docksAvailable} places`,
          imageUrl: mapPreviewUrl(station.latitude, station.longitude, 16),
          tone: this.markerTone(station),
          payload: { type: 'velo' as const, station },
        }));
      return scored;
    }
    if (layer === 'parking') {
      return [...(this.parkingCatalog()?.data ?? [])]
        .sort((left, right) => Number(right.isFree) - Number(left.isFree))
        .slice(0, 16)
        .map((lot) => ({
          id: lot.parkingId,
          title: frenchTitleCase(lot.name),
          meta: lot.isFree
            ? `Gratuit · ${lot.capacity ?? '—'} places`
            : `${lot.capacity ?? '—'} places · ${lot.city ?? 'Toulouse'}`,
          imageUrl: mapPreviewUrl(lot.latitude, lot.longitude, 15),
          tone: '#222222',
          payload: { type: 'parking' as const, lot },
        }));
    }
    if (layer === 'places') {
      return [...this.mappedPlaces()]
        .sort((left, right) => {
          const leftPhoto = left.imageUrl ? 0 : 1;
          const rightPhoto = right.imageUrl ? 0 : 1;
          return leftPhoto - rightPhoto || left.name.localeCompare(right.name, 'fr');
        })
        .slice(0, 20)
        .map((place) => ({
          id: place.placeId,
          title: place.name,
          meta: `${this.placeKindLabel(place.kind)}${place.district ? ` · ${place.district}` : ''}`,
          imageUrl: place.imageUrl ?? null,
          tone: '#0f766e',
          payload: { type: 'place' as const, place },
        }));
    }
    return this.mappedEvents()
      .slice(0, 20)
      .map((event) => ({
        id: event.eventId,
        title: event.title,
        meta: `${event.venueName || event.city || 'Toulouse'}${event.startsOn ? ` · ${event.startsOn}` : ''}`,
        imageUrl: event.imageUrl ?? null,
        tone: '#e8527a',
        payload: { type: 'event' as const, event },
      }));
  });

  protected readonly markerCount = computed(
    () =>
      this.visibleStations().length +
      this.visibleLots().length +
      this.visibleEvents().length +
      this.visiblePlaces().length,
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
    this.placesApi.listPlaces('all').subscribe({
      next: (payload) => this.placesCatalog.set(payload),
      error: () => this.placesCatalog.set(null),
    });

    effect(() => {
      const host = this.mapHost();
      const stations = this.visibleStations();
      const lots = this.visibleLots();
      const events = this.visibleEvents();
      const places = this.visiblePlaces();
      if (!host) {
        return;
      }
      this.ensureMap(host.nativeElement);
      this.syncMarkers(stations, lots, events, places);
    });
  }

  ngOnInit(): void {
    const layerParam = this.route.snapshot.queryParamMap.get('layer');
    if (this.isMapLayer(layerParam)) {
      this.mapLayer.set(layerParam);
    }
  }

  ngOnDestroy(): void {
    this.clearMap();
  }

  protected setLayer(layer: MapLayer): void {
    this.mapLayer.set(layer);
    this.selection.set(null);
    this.filtersOpen.set(false);
    if (layer !== 'places') {
      this.placeKindFilter.set('all');
    }
    if (layer !== 'velo') {
      this.veloQuickFilter.set('all');
    }
    if (layer !== 'parking') {
      this.parkingQuickFilter.set('all');
    }
    if (layer !== 'events') {
      this.eventQuickFilter.set('all');
    }
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { layer },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  protected toggleFilters(): void {
    this.filtersOpen.update((open) => !open);
  }

  protected stationTitle(name: string): string {
    return frenchTitleCase(name);
  }

  private isMapLayer(value: string | null): value is MapLayer {
    return (
      value === 'velo' ||
      value === 'parking' ||
      value === 'events' ||
      value === 'places'
    );
  }

  protected setPlaceKind(kind: PlaceKindFilter): void {
    this.placeKindFilter.set(kind);
  }

  protected setVeloQuick(filter: VeloQuickFilter): void {
    this.veloQuickFilter.set(filter);
  }

  protected setParkingQuick(filter: ParkingQuickFilter): void {
    this.parkingQuickFilter.set(filter);
  }

  protected setEventQuick(filter: EventQuickFilter): void {
    this.eventQuickFilter.set(filter);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected clearSearch(): void {
    this.searchQuery.set('');
  }

  protected selectHit(hit: SearchHit): void {
    this.focusSelection(hit.payload, [hit.latitude, hit.longitude], 15);
    this.searchQuery.set('');
  }

  protected selectFromRail(payload: MapSelection): void {
    const coords = this.coordsOf(payload);
    if (!coords) {
      return;
    }
    this.focusSelection(payload, coords, 15);
  }

  protected clearSelection(): void {
    this.selection.set(null);
  }

  protected scrollRail(direction: -1 | 1): void {
    const host = this.railHost()?.nativeElement;
    if (!host) {
      return;
    }
    host.scrollBy({ left: direction * 280, behavior: 'smooth' });
  }

  protected locateMe(): void {
    if (!navigator.geolocation) {
      this.locateError.set('Géolocalisation indisponible sur cet appareil.');
      return;
    }
    this.locating.set(true);
    this.locateError.set(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.locating.set(false);
        const point: LatLngExpression = [
          position.coords.latitude,
          position.coords.longitude,
        ];
        if (!this.leafletMap || !this.markerLayer) {
          return;
        }
        this.userMarker?.remove();
        this.userMarker = circleMarker(point, {
          radius: 9,
          color: '#ffffff',
          fillColor: '#1d9bf0',
          fillOpacity: 1,
          weight: 3,
        }).bindTooltip('Vous êtes ici', { permanent: false });
        this.userMarker.addTo(this.markerLayer);
        this.leafletMap.setView(point, 15, { animate: true });
      },
      () => {
        this.locating.set(false);
        this.locateError.set('Impossible d’obtenir votre position.');
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    );
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

  protected veloCanReturn(station: VeloStation): boolean {
    return veloCanReturn(station);
  }

  protected veloOccupied(station: VeloStation): number | null {
    return veloOccupiedDocks(station);
  }

  protected veloOccupancyPercent(station: VeloStation): number | null {
    const ratio = veloOccupancyRatio(station);
    return ratio === null ? null : Math.round(ratio * 100);
  }

  protected veloReportedLabel(station: VeloStation): string | null {
    return veloReportedAgo(station.lastReportedAt);
  }

  protected locationPreview(
    latitude: number,
    longitude: number,
    zoom = 16,
  ): string {
    return mapPreviewUrl(latitude, longitude, zoom);
  }

  protected placeKindLabel(kind: PlaceKind): string {
    return (
      this.placeKinds.find((item) => item.id === kind)?.label ?? kind
    );
  }

  protected mapsUrl(latitude: number, longitude: number): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
  }

  protected typeLabel(type: MapSelection['type']): string {
    switch (type) {
      case 'velo':
        return 'Vélô';
      case 'parking':
        return 'Parking';
      case 'event':
        return 'Événement';
      case 'place':
        return 'Lieu';
    }
  }

  protected isSelected(payload: MapSelection): boolean {
    const current = this.selection();
    if (!current || current.type !== payload.type) {
      return false;
    }
    switch (payload.type) {
      case 'velo':
        return current.type === 'velo' && current.station.stationId === payload.station.stationId;
      case 'parking':
        return current.type === 'parking' && current.lot.parkingId === payload.lot.parkingId;
      case 'event':
        return current.type === 'event' && current.event.eventId === payload.event.eventId;
      case 'place':
        return current.type === 'place' && current.place.placeId === payload.place.placeId;
    }
  }

  private focusSelection(
    payload: MapSelection,
    coords: LatLngExpression,
    zoom: number,
  ): void {
    this.selection.set(payload);
    if (payload.type === 'velo') {
      this.mapLayer.set('velo');
    } else if (payload.type === 'parking') {
      this.mapLayer.set('parking');
    } else if (payload.type === 'event') {
      this.mapLayer.set('events');
    } else {
      this.mapLayer.set('places');
    }
    this.leafletMap?.setView(coords, zoom, { animate: true });
  }

  private coordsOf(payload: MapSelection): LatLngExpression | null {
    switch (payload.type) {
      case 'velo':
        return [payload.station.latitude, payload.station.longitude];
      case 'parking':
        return [payload.lot.latitude, payload.lot.longitude];
      case 'event':
        if (payload.event.latitude === null || payload.event.longitude === null) {
          return null;
        }
        return [payload.event.latitude, payload.event.longitude];
      case 'place':
        if (payload.place.latitude === null || payload.place.longitude === null) {
          return null;
        }
        return [payload.place.latitude, payload.place.longitude];
    }
  }

  private ensureMap(host: HTMLDivElement): void {
    if (this.leafletMap) {
      return;
    }
    this.leafletMap = createMap(host, {
      zoomControl: true,
      attributionControl: true,
    }).setView([43.6045, 1.444], 13);
    tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap',
    }).addTo(this.leafletMap);
    this.markerLayer = new LayerGroup().addTo(this.leafletMap);
    window.setTimeout(() => this.leafletMap?.invalidateSize(), 0);
  }

  private syncMarkers(
    stations: VeloStation[],
    lots: ParkingLot[],
    events: CultureEvent[],
    places: Place[],
  ): void {
    if (!this.leafletMap || !this.markerLayer) {
      return;
    }
    this.markerLayer.clearLayers();
    if (this.userMarker) {
      this.userMarker.addTo(this.markerLayer);
    }

    for (const station of stations) {
      circleMarker([station.latitude, station.longitude], {
        radius: 6,
        color: this.markerTone(station),
        fillColor: this.markerTone(station),
        fillOpacity: 0.9,
        weight: 1,
      })
        .on('click', () => {
          this.zone.run(() => this.selection.set({ type: 'velo', station }));
        })
        .addTo(this.markerLayer);
    }

    for (const lot of lots) {
      circleMarker([lot.latitude, lot.longitude], {
        radius: 7,
        color: '#222222',
        fillColor: '#222222',
        fillOpacity: 0.9,
        weight: 1,
      })
        .on('click', () => {
          this.zone.run(() => this.selection.set({ type: 'parking', lot }));
        })
        .addTo(this.markerLayer);
    }

    for (const event of events) {
      if (event.latitude === null || event.longitude === null) {
        continue;
      }
      circleMarker([event.latitude, event.longitude], {
        radius: 7,
        color: '#e8527a',
        fillColor: '#e8527a',
        fillOpacity: 0.95,
        weight: 1,
      })
        .on('click', () => {
          this.zone.run(() => this.selection.set({ type: 'event', event }));
        })
        .addTo(this.markerLayer);
    }

    for (const place of places) {
      if (place.latitude === null || place.longitude === null) {
        continue;
      }
      circleMarker([place.latitude, place.longitude], {
        radius: 6,
        color: '#0f766e',
        fillColor: '#0f766e',
        fillOpacity: 0.88,
        weight: 1,
      })
        .on('click', () => {
          this.zone.run(() => this.selection.set({ type: 'place', place }));
        })
        .addTo(this.markerLayer);
    }

    window.setTimeout(() => this.leafletMap?.invalidateSize(), 0);
  }

  private clearMap(): void {
    this.markerLayer?.clearLayers();
    this.leafletMap?.remove();
    this.leafletMap = null;
    this.markerLayer = null;
    this.userMarker = null;
  }

  private parisToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
