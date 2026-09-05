import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, CultureEvent } from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';

type EventSort = 'date-asc' | 'date-desc' | 'title-asc';
type WhenFilter = 'all' | 'today' | 'tomorrow' | 'weekend' | 'week' | 'month';
type PhotoFilter = 'all' | 'with-photo';

@Component({
  selector: 'app-events-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export class EventsPage implements OnInit {
  private readonly eventsApi = inject(EventsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly catalog = signal<CatalogResponse<CultureEvent[]> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly sortMode = signal<EventSort>('date-asc');
  protected readonly whenFilter = signal<WhenFilter>('all');
  protected readonly cityFilter = signal<string>('all');
  protected readonly photoFilter = signal<PhotoFilter>('all');
  protected readonly skeletonCardSlots = [1, 2, 3, 4, 5, 6];

  protected readonly cityOptions = computed(() => {
    const cities = new Set<string>();
    for (const event of this.catalog()?.data ?? []) {
      const city = event.city?.trim();
      if (city) {
        cities.add(city);
      }
    }
    return [...cities].sort((left, right) => left.localeCompare(right, 'fr'));
  });

  protected readonly filteredEvents = computed(() => {
    const today = this.parisToday();
    const query = this.normalize(this.searchQuery());
    const when = this.whenFilter();
    const city = this.cityFilter();
    const photo = this.photoFilter();
    const sortMode = this.sortMode();
    const weekLimit = this.addDays(today, 7);
    const monthLimit = this.addDays(today, 31);

    let events = (this.catalog()?.data ?? []).filter((event) =>
      this.isUpcomingOrOngoing(event, today),
    );

    if (query) {
      events = events.filter((event) => {
        const haystack = this.normalize(
          [
            event.title,
            event.venueName,
            event.city,
            event.category,
            event.type,
            event.theme,
            ...(event.keywords ?? []),
          ]
            .filter(Boolean)
            .join(' '),
        );
        return haystack.includes(query);
      });
    }

    if (city !== 'all') {
      events = events.filter((event) => event.city === city);
    }

    if (photo === 'with-photo') {
      events = events.filter((event) => Boolean(event.imageUrl));
    }

    if (when === 'today') {
      events = events.filter((event) => this.eventOverlapsDay(event, today));
    } else if (when === 'tomorrow') {
      const tomorrow = this.addDays(today, 1);
      events = events.filter((event) => this.eventOverlapsDay(event, tomorrow));
    } else if (when === 'weekend') {
      const weekend = this.parisWeekendRange(today);
      events = events.filter((event) =>
        this.eventOverlapsRange(event, weekend.start, weekend.end),
      );
    } else if (when === 'week') {
      events = events.filter((event) => {
        const start = event.startsOn ?? event.endsOn ?? '';
        return start !== '' && start <= weekLimit;
      });
    } else if (when === 'month') {
      events = events.filter((event) => {
        const start = event.startsOn ?? event.endsOn ?? '';
        return start !== '' && start <= monthLimit;
      });
    }

    return [...events].sort((left, right) => {
      if (sortMode === 'title-asc') {
        return left.title.localeCompare(right.title, 'fr');
      }
      const leftDate = left.startsOn ?? left.endsOn ?? '';
      const rightDate = right.startsOn ?? right.endsOn ?? '';
      const byDate = leftDate.localeCompare(rightDate);
      if (sortMode === 'date-desc') {
        return -byDate || left.title.localeCompare(right.title, 'fr');
      }
      return byDate || left.title.localeCompare(right.title, 'fr');
    });
  });

  ngOnInit(): void {
    const whenParam = this.route.snapshot.queryParamMap.get('when');
    if (this.isWhenFilter(whenParam)) {
      this.whenFilter.set(whenParam);
    }

    this.eventsApi.listEvents().subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Agenda temporairement indisponible.'),
    });
  }

  protected onSearchInput(value: string): void {
    this.searchQuery.set(value);
  }

  protected onSortChange(value: string): void {
    if (value === 'date-asc' || value === 'date-desc' || value === 'title-asc') {
      this.sortMode.set(value);
    }
  }

  protected setWhenFilter(value: WhenFilter): void {
    this.whenFilter.set(value);
  }

  protected setCityFilter(value: string): void {
    this.cityFilter.set(value);
  }

  protected setPhotoFilter(value: PhotoFilter): void {
    this.photoFilter.set(value);
  }

  protected clearFilters(): void {
    this.searchQuery.set('');
    this.sortMode.set('date-asc');
    this.whenFilter.set('all');
    this.cityFilter.set('all');
    this.photoFilter.set('all');
  }

  protected hasActiveFilters(): boolean {
    return (
      this.searchQuery().trim().length > 0 ||
      this.whenFilter() !== 'all' ||
      this.cityFilter() !== 'all' ||
      this.photoFilter() !== 'all' ||
      this.sortMode() !== 'date-asc'
    );
  }

  private isWhenFilter(value: string | null): value is WhenFilter {
    return (
      value === 'all' ||
      value === 'today' ||
      value === 'tomorrow' ||
      value === 'weekend' ||
      value === 'week' ||
      value === 'month'
    );
  }

  private isUpcomingOrOngoing(event: CultureEvent, today: string): boolean {
    const end = event.endsOn ?? event.startsOn ?? '';
    return Boolean(end) && end >= today;
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

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }
}
