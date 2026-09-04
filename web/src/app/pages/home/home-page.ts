import { DatePipe, DecimalPipe } from '@angular/common';
import {
  Component,
  computed,
  HostListener,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { TisseoApi } from '../../core/tisseo-api';
import { VeloApi } from '../../core/velo-api';
import { WeatherApi } from '../../core/weather-api';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe, DecimalPipe, FormsModule],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
  private readonly router = inject(Router);
  private readonly searchCatalog = inject(SearchCatalog);
  private readonly veloApi = inject(VeloApi);
  private readonly tisseoApi = inject(TisseoApi);
  private readonly weatherApi = inject(WeatherApi);
  private readonly airApi = inject(AirApi);
  private readonly eventsApi = inject(EventsApi);
  private readonly placesApi = inject(PlacesApi);

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

  protected readonly searchHits = computed(() =>
    this.searchCatalog.search(this.searchQuery()),
  );

  protected readonly highlightStation = computed(() => {
    const stations = this.veloCatalog()?.data ?? [];
    if (stations.length === 0) {
      return null;
    }
    return [...stations].sort(
      (left, right) => right.bikesAvailable - left.bikesAvailable,
    )[0];
  });

  protected readonly nextEvents = computed(() =>
    (this.eventsCatalog()?.data ?? []).slice(0, 8),
  );

  protected readonly featuredPlaces = computed(() => {
    const places = this.placesCatalog()?.data ?? [];
    const withPhoto = places.filter((place) => Boolean(place.imageUrl));
    const pool = withPhoto.length >= 4 ? withPhoto : places;
    return pool.slice(0, 8);
  });

  protected readonly severeAlertCount = computed(
    () =>
      (this.tisseoCatalog()?.data ?? []).filter(
        (alert) => alert.severity === 'severe',
      ).length,
  );

  ngOnInit(): void {
    this.searchCatalog.ensureLoaded();
    this.veloApi.listStations().subscribe({
      next: (payload) => this.veloCatalog.set(payload),
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
      next: (payload) => this.eventsCatalog.set(payload),
      error: () => this.eventsCatalog.set(null),
    });
    this.placesApi.listPlaces('all').subscribe({
      next: (payload) => this.placesCatalog.set(payload),
      error: () => this.placesCatalog.set(null),
    });
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
}
