import { Injectable, computed, inject, signal } from '@angular/core';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CultureEvent, Place, VeloStation } from './catalog.models';
import { EventsApi } from './events-api';
import { PlacesApi } from './places-api';
import { VeloApi } from './velo-api';

export type SearchHit =
  | { kind: 'event'; label: string; sub: string; link: string }
  | { kind: 'place'; label: string; sub: string; link: string }
  | { kind: 'velo'; label: string; sub: string; link: string };

@Injectable({ providedIn: 'root' })
export class SearchCatalog {
  private readonly eventsApi = inject(EventsApi);
  private readonly placesApi = inject(PlacesApi);
  private readonly veloApi = inject(VeloApi);
  private loadStarted = false;
  private pendingSources = 0;

  private readonly events = signal<CultureEvent[]>([]);
  private readonly places = signal<Place[]>([]);
  private readonly stations = signal<VeloStation[]>([]);
  private readonly revision = signal(0);

  readonly ready = signal(false);
  readonly loading = signal(false);
  readonly catalogRevision = computed(() => this.revision());

  ensureLoaded(): void {
    if (this.loadStarted) {
      return;
    }
    this.loadStarted = true;
    this.loading.set(true);
    this.pendingSources = 3;

    this.eventsApi
      .listEvents()
      .pipe(catchError(() => of(null)))
      .subscribe((payload) => {
        this.events.set(payload?.data ?? []);
        this.onSourceDone();
      });

    this.placesApi
      .listPlaces('all')
      .pipe(catchError(() => of(null)))
      .subscribe((payload) => {
        this.places.set(payload?.data ?? []);
        this.onSourceDone();
      });

    this.veloApi
      .listStations()
      .pipe(catchError(() => of(null)))
      .subscribe((payload) => {
        this.stations.set(payload?.data ?? []);
        this.onSourceDone();
      });
  }

  hydrate(partial: {
    events?: CultureEvent[];
    places?: Place[];
    stations?: VeloStation[];
  }): void {
    if (partial.events?.length) {
      this.events.set(partial.events);
    }
    if (partial.places?.length) {
      this.places.set(partial.places);
    }
    if (partial.stations?.length) {
      this.stations.set(partial.stations);
    }
    if (
      this.events().length ||
      this.places().length ||
      this.stations().length
    ) {
      this.ready.set(true);
    }
    this.bump();
  }

  search(queryRaw: string): SearchHit[] {
    this.revision();
    const query = this.normalize(queryRaw);
    if (query.length < 2) {
      return [];
    }

    const hits: SearchHit[] = [];
    const limit = 16;

    for (const event of this.events()) {
      const hay = this.normalize(
        `${event.title} ${event.venueName ?? ''} ${event.city ?? ''} ${event.summary ?? ''}`,
      );
      if (hay.includes(query)) {
        hits.push({
          kind: 'event',
          label: event.title,
          sub: event.venueName || event.city || 'Événement',
          link: `/evenements/${event.eventId}`,
        });
      }
      if (hits.length >= limit) {
        return hits;
      }
    }

    for (const place of this.places()) {
      const hay = this.normalize(
        `${place.name} ${place.address ?? ''} ${place.city ?? ''} ${place.district ?? ''} ${place.kind}`,
      );
      if (hay.includes(query)) {
        hits.push({
          kind: 'place',
          label: place.name,
          sub: place.city || place.kind || 'Lieu',
          link: `/lieux/${encodeURIComponent(place.placeId)}`,
        });
      }
      if (hits.length >= limit) {
        return hits;
      }
    }

    for (const station of this.stations()) {
      const hay = this.normalize(`${station.name} ${station.address ?? ''}`);
      if (hay.includes(query)) {
        hits.push({
          kind: 'velo',
          label: station.name,
          sub: `${station.bikesAvailable} vélos`,
          link: `/velo/${station.stationId}`,
        });
      }
      if (hits.length >= limit) {
        return hits;
      }
    }

    return hits;
  }

  counts(): { events: number; places: number; stations: number } {
    this.revision();
    return {
      events: this.events().length,
      places: this.places().length,
      stations: this.stations().length,
    };
  }

  private onSourceDone(): void {
    this.pendingSources = Math.max(0, this.pendingSources - 1);
    this.bump();
    if (this.pendingSources === 0) {
      this.ready.set(true);
      this.loading.set(false);
    } else if (
      this.events().length ||
      this.places().length ||
      this.stations().length
    ) {
      // Usable as soon as the first source arrives.
      this.ready.set(true);
    }
  }

  private bump(): void {
    this.revision.update((value) => value + 1);
  }

  private normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/['’]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
