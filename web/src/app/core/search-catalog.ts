import { Injectable, inject, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
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
  private loaded = false;

  private readonly events = signal<CultureEvent[]>([]);
  private readonly places = signal<Place[]>([]);
  private readonly stations = signal<VeloStation[]>([]);

  ensureLoaded(): void {
    if (this.loaded) {
      return;
    }
    this.loaded = true;
    forkJoin({
      events: this.eventsApi.listEvents().pipe(catchError(() => of(null))),
      places: this.placesApi.listPlaces('all').pipe(catchError(() => of(null))),
      velo: this.veloApi.listStations().pipe(catchError(() => of(null))),
    }).subscribe(({ events, places, velo }) => {
      this.events.set(events?.data ?? []);
      this.places.set(places?.data ?? []);
      this.stations.set(velo?.data ?? []);
    });
  }

  search(queryRaw: string): SearchHit[] {
    const query = queryRaw.trim().toLowerCase();
    if (query.length < 2) {
      return [];
    }
    const hits: SearchHit[] = [];

    for (const event of this.events()) {
      const hay =
        `${event.title} ${event.venueName ?? ''} ${event.city ?? ''}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          kind: 'event',
          label: event.title,
          sub: event.venueName || event.city || 'Événement',
          link: `/evenements/${event.eventId}`,
        });
      }
      if (hits.length >= 8) {
        return hits;
      }
    }

    for (const place of this.places()) {
      const hay =
        `${place.name} ${place.address ?? ''} ${place.city ?? ''}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          kind: 'place',
          label: place.name,
          sub: place.city || 'Lieu',
          link: `/lieux/${encodeURIComponent(place.placeId)}`,
        });
      }
      if (hits.length >= 12) {
        return hits;
      }
    }

    for (const station of this.stations()) {
      const hay = `${station.name} ${station.address ?? ''}`.toLowerCase();
      if (hay.includes(query)) {
        hits.push({
          kind: 'velo',
          label: station.name,
          sub: `${station.bikesAvailable} vélos`,
          link: `/velo/${station.stationId}`,
        });
      }
      if (hits.length >= 16) {
        return hits;
      }
    }

    return hits;
  }
}
