import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CatalogResponse,
  CultureEvent,
  VeloStation,
  WeatherForecast,
} from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';
import { VeloApi } from '../../core/velo-api';
import { WeatherApi } from '../../core/weather-api';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink, DecimalPipe],
  templateUrl: './landing-page.html',
  styleUrl: './landing-page.scss',
})
export class LandingPage implements OnInit, OnDestroy {
  private readonly host = inject(ElementRef<HTMLElement>);
  private readonly eventsApi = inject(EventsApi);
  private readonly veloApi = inject(VeloApi);
  private readonly weatherApi = inject(WeatherApi);
  private observer: IntersectionObserver | null = null;

  protected readonly eventsCatalog = signal<CatalogResponse<
    CultureEvent[]
  > | null>(null);
  protected readonly veloCatalog = signal<CatalogResponse<VeloStation[]> | null>(
    null,
  );
  protected readonly weatherCatalog = signal<CatalogResponse<WeatherForecast> | null>(
    null,
  );

  protected readonly statsLoading = computed(
    () =>
      this.eventsCatalog() === null ||
      this.veloCatalog() === null ||
      this.weatherCatalog() === null,
  );

  protected readonly weekendEventCount = computed(() => {
    const today = this.parisToday();
    const weekend = this.parisWeekendRange(today);
    return (this.eventsCatalog()?.data ?? []).filter((event) =>
      this.eventOverlapsRange(event, weekend.start, weekend.end),
    ).length;
  });

  protected readonly todayEventCount = computed(() => {
    const today = this.parisToday();
    return (this.eventsCatalog()?.data ?? []).filter((event) =>
      this.eventOverlapsDay(event, today),
    ).length;
  });

  protected readonly bikesAvailableTotal = computed(() =>
    (this.veloCatalog()?.data ?? []).reduce(
      (sum, station) => sum + (station.bikesAvailable ?? 0),
      0,
    ),
  );

  protected readonly currentWeather = computed(
    () => this.weatherCatalog()?.data?.current ?? null,
  );

  protected readonly primaryCtaLabel = computed(() => {
    const weekendCount = this.weekendEventCount();
    if (this.eventsCatalog() === null) {
      return 'Explorer Toulouse';
    }
    if (weekendCount > 0) {
      return `Voir le week-end · ${weekendCount}`;
    }
    const todayCount = this.todayEventCount();
    if (todayCount > 0) {
      return `Voir aujourd’hui · ${todayCount}`;
    }
    return 'Explorer Toulouse';
  });

  protected readonly productShots = [
    {
      id: 'explorer',
      src: '/marketing/screens/explorer.jpg',
      alt: 'Écran Explorer TouRose — pulse du jour et événements',
      label: 'Explorer',
      caption: 'Le pulse de Toulouse en un coup d’œil',
    },
    {
      id: 'events',
      src: '/marketing/screens/events.jpg',
      alt: 'Écran Événements TouRose — filtres et agenda',
      label: 'Événements',
      caption: 'Ce soir, demain, le week-end',
    },
    {
      id: 'map',
      src: '/marketing/screens/map.jpg',
      alt: 'Écran Carte TouRose — stations Vélô',
      label: 'Carte · Vélô',
      caption: 'Une couche à la fois, des vélos tout de suite',
    },
  ] as const;

  protected readonly pillars = [
    {
      title: 'Savoir où sortir ce soir',
      text: 'Concerts, expos, festivals — filtrés pour aujourd’hui, demain ou le week-end. Moins de scroll, plus de décisions.',
      image: '/onboarding/events.jpg',
      alt: 'Affiches d’événements sur un mur de Toulouse',
      link: '/evenements',
      cta: 'Voir ce qu’il se passe',
    },
    {
      title: 'Trouver un vélo en 10 secondes',
      text: 'Stations Vélô, parkings et lieux sur une carte claire. Une couche à la fois — tu vois ce qui compte.',
      image: '/onboarding/map.jpg',
      alt: 'Carte de Toulouse avec repères de mobilité',
      link: '/carte',
      cta: 'Ouvrir la carte',
    },
    {
      title: 'Partir avec le bon réflexe',
      text: 'Météo, air et alertes Tisséo avant de sortir. Plus besoin de trois apps pour savoir s’il faut un manteau.',
      image: '/onboarding/weather.jpg',
      alt: 'Ciel de Toulouse au-dessus des toits roses',
      link: '/meteo',
      cta: 'Voir météo & air',
    },
  ] as const;

  protected readonly sellingPoints = [
    {
      title: 'Zéro friction',
      text: 'Pas de compte, pas de pub. Tu ouvres, tu sais quoi faire.',
    },
    {
      title: 'Infos de la ville',
      text: 'Agenda, Vélô, Tisséo, météo — des sources publiques, fraîches, affichées telles quelles.',
    },
    {
      title: 'Fait pour Toulouse',
      text: 'Pas un outil générique. Un compagnon local pour ceux qui vivent ou arrivent ici.',
    },
  ] as const;

  constructor() {
    afterNextRender(() => this.setupReveal());
  }

  ngOnInit(): void {
    this.eventsApi.listEvents().subscribe({
      next: (payload) => this.eventsCatalog.set(payload),
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
    this.veloApi.listStations().subscribe({
      next: (payload) => this.veloCatalog.set(payload),
      error: () =>
        this.veloCatalog.set({
          status: 'unavailable',
          fetchedAt: null,
          expiresAt: null,
          source: 'Velo',
          license: '',
          data: [],
        }),
    });
    this.weatherApi.getForecast('capitole').subscribe({
      next: (payload) => this.weatherCatalog.set(payload),
      error: () => this.weatherCatalog.set(null),
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  private setupReveal(): void {
    const root = this.host.nativeElement;
    const nodes = Array.from(
      root.querySelectorAll('[data-reveal]'),
    ) as HTMLElement[];
    if (nodes.length === 0) {
      return;
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      for (const node of nodes) {
        node.classList.add('is-revealed');
      }
      return;
    }

    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('is-revealed');
          this.observer?.unobserve(entry.target);
        }
      },
      { threshold: 0.16, rootMargin: '0px 0px -8% 0px' },
    );

    for (const node of nodes) {
      this.observer.observe(node);
    }
  }

  private eventOverlapsDay(event: CultureEvent, day: string): boolean {
    const start = event.startsOn ?? event.endsOn ?? '';
    const end = event.endsOn ?? event.startsOn ?? '';
    return Boolean(start) && start <= day && end >= day;
  }

  private eventOverlapsRange(
    event: CultureEvent,
    rangeStart: string,
    rangeEnd: string,
  ): boolean {
    const start = event.startsOn ?? event.endsOn ?? '';
    const end = event.endsOn ?? event.startsOn ?? '';
    return Boolean(start) && start <= rangeEnd && end >= rangeStart;
  }

  private parisWeekendRange(today: string): { start: string; end: string } {
    const date = new Date(`${today}T12:00:00`);
    const weekday = date.getDay();
    if (weekday === 0) {
      return { start: this.addDays(today, -1), end: today };
    }
    if (weekday === 6) {
      return { start: today, end: this.addDays(today, 1) };
    }
    const daysUntilSaturday = 6 - weekday;
    return {
      start: this.addDays(today, daysUntilSaturday),
      end: this.addDays(today, daysUntilSaturday + 1),
    };
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
}
