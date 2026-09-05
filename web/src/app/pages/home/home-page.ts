import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AirIndex,
  CatalogResponse,
  CultureEvent,
  Place,
  TisseoAlert,
  VeloStation,
  WeatherForecast,
} from '../../core/catalog.models';
import { AirApi } from '../../core/air-api';
import { EventsApi } from '../../core/events-api';
import { PlacesApi } from '../../core/places-api';
import { SearchCatalog, SearchHit } from '../../core/search-catalog';
import { SuggestApi, SuggestItem, SuggestResponse } from '../../core/suggest-api';
import { TisseoApi } from '../../core/tisseo-api';
import { VeloApi } from '../../core/velo-api';
import { WeatherApi } from '../../core/weather-api';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  private readonly searchCatalog = inject(SearchCatalog);
  private readonly suggestApi = inject(SuggestApi);
  private readonly veloApi = inject(VeloApi);
  private readonly tisseoApi = inject(TisseoApi);
  private readonly weatherApi = inject(WeatherApi);
  private readonly airApi = inject(AirApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly placesApi = inject(PlacesApi);
  private placesPhotoPollHandle: number | null = null;
  private placesPhotoPollCount = 0;
  private eventsPhotoPollHandle: number | null = null;
  private eventsPhotoPollCount = 0;

  protected readonly skeletonPulseSlots = [1, 2, 3, 4];
  protected readonly skeletonCardSlots = [1, 2, 3, 4, 5, 6, 7, 8];

  protected readonly veloCatalog = signal<CatalogResponse<VeloStation[]> | null>(
    null,
  );
  protected readonly tisseoCatalog = signal<CatalogResponse<
    TisseoAlert[]
  > | null>(null);
  protected readonly weatherCatalog = signal<CatalogResponse<WeatherForecast> | null>(
    null,
  );
  protected readonly airCatalog = signal<CatalogResponse<AirIndex | null> | null>(
    null,
  );
  protected readonly eventsCatalog = signal<CatalogResponse<
    CultureEvent[]
  > | null>(null);
  protected readonly placesCatalog = signal<CatalogResponse<Place[]> | null>(
    null,
  );
  protected readonly searchQuery = signal('');
  protected readonly searchOpen = signal(false);
  protected readonly askPrompt = signal('');
  protected readonly askLoading = signal(false);
  protected readonly askError = signal<string | null>(null);
  protected readonly askResult = signal<SuggestResponse | null>(null);
  protected readonly askMode = signal<'llm' | 'heuristic' | null>(null);
  protected readonly brokenImages = signal<ReadonlySet<string>>(new Set());
  protected readonly loadedImages = signal<ReadonlySet<string>>(new Set());

  protected readonly askExamples = [
    'Concert ce soir',
    'Balade au soleil',
    'Vélo près du Capitole',
  ];

  protected readonly searchHits = computed(() => {
    // Depend explicitly on catalog updates + query.
    this.searchCatalog.catalogRevision();
    return this.searchCatalog.search(this.searchQuery());
  });

  protected readonly searchStatus = computed(() => {
    this.searchCatalog.catalogRevision();
    if (this.searchCatalog.loading() && !this.searchCatalog.ready()) {
      return 'loading' as const;
    }
    const counts = this.searchCatalog.counts();
    if (
      counts.events + counts.places + counts.stations === 0 &&
      this.searchCatalog.ready()
    ) {
      return 'empty-catalog' as const;
    }
    return 'ready' as const;
  });

  protected readonly pulseLoading = computed(
    () =>
      this.veloCatalog() === null ||
      this.tisseoCatalog() === null ||
      this.weatherCatalog() === null ||
      this.airCatalog() === null,
  );

  protected readonly eventsLoading = computed(() => this.eventsCatalog() === null);

  protected readonly placesLoading = computed(() => this.placesCatalog() === null);

  protected readonly highlightStation = computed(() => {
    const stations = this.veloCatalog()?.data ?? [];
    if (stations.length === 0) {
      return null;
    }
    return [...stations].sort(
      (left, right) => right.bikesAvailable - left.bikesAvailable,
    )[0];
  });

  protected readonly nextEvents = computed(() => {
    const today = this.parisToday();
    const events = (this.eventsCatalog()?.data ?? []).filter((event) => {
      const end = event.endsOn ?? event.startsOn ?? '';
      return Boolean(end) && end >= today;
    });
    const withPhoto = events.filter(
      (event) => Boolean(event.imageUrl) && !this.brokenImages().has(event.imageUrl!),
    );
    const pool = withPhoto.length >= 4 ? withPhoto : events;
    return pool.slice(0, 8);
  });

  protected readonly featuredPlaces = computed(() => {
    const places = this.placesCatalog()?.data ?? [];
    const withPhoto = places.filter(
      (place) => Boolean(place.imageUrl) && !this.brokenImages().has(place.imageUrl!),
    );
    const pool = withPhoto.length >= 4 ? withPhoto : places;
    return pool.slice(0, 8);
  });

  protected readonly spotlightEvents = computed(() => {
    return this.nextEvents().slice(0, 3);
  });

  protected readonly trustUpdatedAt = computed(() => {
    const stamps = [
      this.veloCatalog()?.fetchedAt,
      this.tisseoCatalog()?.fetchedAt,
      this.weatherCatalog()?.fetchedAt,
      this.airCatalog()?.fetchedAt,
      this.eventsCatalog()?.fetchedAt,
      this.placesCatalog()?.fetchedAt,
    ].filter((value): value is string => Boolean(value));
    if (stamps.length === 0) {
      return null;
    }
    return [...stamps].sort().at(-1) ?? null;
  });

  protected readonly severeAlertCount = computed(
    () =>
      (this.tisseoCatalog()?.data ?? []).filter(
        (alert) => alert.severity === 'severe',
      ).length,
  );

  protected veloAriaLabel(): string {
    const station = this.highlightStation();
    if (!station) {
      return 'Vélô : chargement';
    }
    return `Vélô : ${station.bikesAvailable} vélos à ${station.name}`;
  }

  protected tisseoAriaLabel(): string {
    const catalog = this.tisseoCatalog();
    if (!catalog) {
      return 'Tisséo : chargement';
    }
    if (catalog.status === 'unavailable') {
      return 'Tisséo : alertes indisponibles';
    }
    const severeCount = this.severeAlertCount();
    const alertCount = catalog.data.length;
    if (alertCount === 0) {
      return 'Tisséo : aucune alerte';
    }
    if (severeCount > 0) {
      return `Tisséo : ${alertCount} alertes dont ${severeCount} fortes`;
    }
    return `Tisséo : ${alertCount} alertes en cours`;
  }

  protected weatherAriaLabel(): string {
    const weather = this.weatherCatalog()?.data;
    if (!weather) {
      return 'Météo : chargement';
    }
    const temperature = Math.round(weather.current.temperature);
    return `Météo : ${temperature}°, ${weather.current.weatherLabel}`;
  }

  protected airAriaLabel(): string {
    const air = this.airCatalog()?.data;
    if (!air) {
      return 'Qualité de l’air : chargement';
    }
    return `Qualité de l’air : indice ${air.qualityCode} sur 6, ${air.qualityLabel}`;
  }

  ngOnInit(): void {
    this.searchCatalog.ensureLoaded();
    this.suggestApi.status().subscribe({
      next: (status) => this.askMode.set(status.mode),
      error: () => this.askMode.set('heuristic'),
    });
    this.veloApi.listStations().subscribe({
      next: (payload) => {
        this.veloCatalog.set(payload);
        this.searchCatalog.hydrate({ stations: payload.data });
      },
      error: () => this.veloCatalog.set(null),
    });
    this.tisseoApi.listAlerts().subscribe({
      next: (payload) => this.tisseoCatalog.set(payload),
      error: () =>
        this.tisseoCatalog.set({
          status: 'unavailable',
          fetchedAt: null,
          expiresAt: null,
          source: 'Tisséo',
          license: 'ODbL',
          data: [],
        }),
    });
    this.weatherApi.getForecast('capitole').subscribe({
      next: (payload) => this.weatherCatalog.set(payload),
      error: () => this.weatherCatalog.set(null),
    });
    this.airApi.getIndex().subscribe({
      next: (payload) => this.airCatalog.set(payload),
      error: () => this.airCatalog.set(null),
    });
    this.eventsApi.listEvents().subscribe({
      next: (payload) => {
        this.eventsCatalog.set(payload);
        this.searchCatalog.hydrate({ events: payload.data });
        this.maybeStartEventsPhotoPoll(payload.data);
      },
      error: () =>
        this.eventsCatalog.set({
          status: 'unavailable',
          fetchedAt: null,
          expiresAt: null,
          source: 'Events',
          license: '',
          data: [],
        }),
    });
    this.placesApi.listPlaces('all').subscribe({
      next: (payload) => {
        this.placesCatalog.set(payload);
        this.searchCatalog.hydrate({ places: payload.data });
        this.maybeStartPlacesPhotoPoll(payload.data);
      },
      error: () =>
        this.placesCatalog.set({
          status: 'unavailable',
          fetchedAt: null,
          expiresAt: null,
          source: 'Places',
          license: '',
          data: [],
        }),
    });
  }

  ngOnDestroy(): void {
    this.clearPlacesPhotoPoll();
    this.clearEventsPhotoPoll();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.searchOpen.set(false);
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
    this.searchOpen.set(value.trim().length >= 2);
  }

  protected goToHit(hit: SearchHit): void {
    this.searchQuery.set('');
    this.searchOpen.set(false);
    void this.router.navigateByUrl(hit.link);
  }

  protected onAskInput(value: string): void {
    this.askPrompt.set(value);
  }

  protected useAskExample(example: string): void {
    this.askPrompt.set(example);
    this.runAsk();
  }

  protected runAsk(): void {
    const prompt = this.askPrompt().trim();
    if (prompt.length < 2 || this.askLoading()) {
      return;
    }
    this.askLoading.set(true);
    this.askError.set(null);
    this.suggestApi.suggest(prompt).subscribe({
      next: (payload) => {
        this.askResult.set(payload);
        this.askLoading.set(false);
      },
      error: () => {
        this.askLoading.set(false);
        this.askError.set('Suggestion indisponible pour le moment.');
      },
    });
  }

  protected goToSuggestion(item: SuggestItem): void {
    if (item.queryParams && Object.keys(item.queryParams).length > 0) {
      const params = new URLSearchParams(item.queryParams).toString();
      void this.router.navigateByUrl(`${item.link}?${params}`);
      return;
    }
    void this.router.navigateByUrl(item.link);
  }

  protected suggestionKindLabel(kind: SuggestItem['kind']): string {
    if (kind === 'event') {
      return 'Événement';
    }
    if (kind === 'place') {
      return 'Lieu';
    }
    if (kind === 'velo') {
      return 'Vélô';
    }
    if (kind === 'weather') {
      return 'Météo';
    }
    return 'Carte';
  }

  protected kindLabelHit(kind: SearchHit['kind']): string {
    if (kind === 'event') {
      return 'Événement';
    }
    if (kind === 'place') {
      return 'Lieu';
    }
    return 'Vélô';
  }

  protected kindLabel(kind: Place['kind']): string {
    const labels: Record<Place['kind'], string> = {
      museum: 'Musée',
      gallery: 'Galerie',
      theatre: 'Théâtre',
      playground: 'Aire de jeux',
      garden: 'Jardin',
      walk: 'Balade',
      heritage: 'Patrimoine',
    };
    return labels[kind];
  }

  protected isImageBroken(imageUrl: string | null | undefined): boolean {
    return Boolean(imageUrl && this.brokenImages().has(imageUrl));
  }

  protected isImageLoaded(imageUrl: string | null | undefined): boolean {
    return Boolean(imageUrl && this.loadedImages().has(imageUrl));
  }

  protected hasVisibleImage(imageUrl: string | null | undefined): boolean {
    return Boolean(imageUrl) && !this.isImageBroken(imageUrl);
  }

  protected onImageLoad(imageUrl: string): void {
    this.loadedImages.update((current) => {
      if (current.has(imageUrl)) {
        return current;
      }
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }

  protected onImageError(imageUrl: string): void {
    this.brokenImages.update((current) => {
      if (current.has(imageUrl)) {
        return current;
      }
      const next = new Set(current);
      next.add(imageUrl);
      return next;
    });
  }

  private maybeStartPlacesPhotoPoll(places: Place[]): void {
    const featured = places.slice(0, 12);
    const missing = featured.filter((place) => !place.imageUrl).length;
    if (missing === 0 || this.placesPhotoPollHandle !== null) {
      return;
    }

    this.placesPhotoPollHandle = window.setInterval(() => {
      this.placesPhotoPollCount += 1;
      this.placesApi.listPlaces('all').subscribe({
        next: (payload) => {
          this.placesCatalog.set(payload);
          this.searchCatalog.hydrate({ places: payload.data });
          const stillMissing = payload.data
            .slice(0, 12)
            .filter((place) => !place.imageUrl).length;
          if (stillMissing === 0 || this.placesPhotoPollCount >= 20) {
            this.clearPlacesPhotoPoll();
          }
        },
      });
    }, 2500);
  }

  private maybeStartEventsPhotoPoll(events: CultureEvent[]): void {
    const withPhoto = events.filter((event) => Boolean(event.imageUrl)).length;
    if (withPhoto >= 8 || this.eventsPhotoPollHandle !== null) {
      return;
    }

    this.eventsPhotoPollHandle = window.setInterval(() => {
      this.eventsPhotoPollCount += 1;
      this.eventsApi.listEvents().subscribe({
        next: (payload) => {
          this.eventsCatalog.set(payload);
          this.searchCatalog.hydrate({ events: payload.data });
          const photos = payload.data.filter((event) => Boolean(event.imageUrl))
            .length;
          if (photos >= 8 || this.eventsPhotoPollCount >= 16) {
            this.clearEventsPhotoPoll();
          }
        },
      });
    }, 2500);
  }

  private clearPlacesPhotoPoll(): void {
    if (this.placesPhotoPollHandle !== null) {
      window.clearInterval(this.placesPhotoPollHandle);
      this.placesPhotoPollHandle = null;
    }
  }

  private clearEventsPhotoPoll(): void {
    if (this.eventsPhotoPollHandle !== null) {
      window.clearInterval(this.eventsPhotoPollHandle);
      this.eventsPhotoPollHandle = null;
    }
  }

  private parisToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }
}
