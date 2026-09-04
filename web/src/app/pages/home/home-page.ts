import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
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
import { TisseoApi } from '../../core/tisseo-api';
import { VeloApi } from '../../core/velo-api';
import { WeatherApi } from '../../core/weather-api';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink, DatePipe, DecimalPipe],
  templateUrl: './home-page.html',
  styleUrl: './home-page.scss',
})
export class HomePage implements OnInit {
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

  protected readonly categories = [
    {
      title: 'Événements',
      subtitle: 'Agenda culturel',
      link: '/evenements',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Toulouse_Capitole_Night_Wikimedia_Commons.jpg/960px-Toulouse_Capitole_Night_Wikimedia_Commons.jpg',
    },
    {
      title: 'Lieux',
      subtitle: 'Musées & patrimoine',
      link: '/lieux',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d5/Mus%C3%A9e_des_Augustin%2C_l%27aile_Darcy_-_Viollet-le-duc.jpg/960px-Mus%C3%A9e_des_Augustin%2C_l%27aile_Darcy_-_Viollet-le-duc.jpg',
    },
    {
      title: 'Carte',
      subtitle: 'Vélô & parkings',
      link: '/carte',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/57/Le_Pont-Neuf_de_Toulouse.jpg/960px-Le_Pont-Neuf_de_Toulouse.jpg',
    },
    {
      title: 'Météo',
      subtitle: 'Temps & ATMO',
      link: '/meteo',
      image:
        'https://upload.wikimedia.org/wikipedia/commons/thumb/4/42/Lac_et_pavillon_du_th%C3%A9.jpg/960px-Lac_et_pavillon_du_th%C3%A9.jpg',
    },
  ];

  ngOnInit(): void {
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
