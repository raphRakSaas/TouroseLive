import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogResponse, CultureEvent } from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';

@Component({
  selector: 'app-events-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './events-page.html',
  styleUrl: './events-page.scss',
})
export class EventsPage implements OnInit {
  private readonly eventsApi = inject(EventsApi);

  protected readonly catalog = signal<CatalogResponse<CultureEvent[]> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.eventsApi.listEvents().subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Agenda temporairement indisponible.'),
    });
  }

  protected mapsUrl(event: CultureEvent): string | null {
    if (event.latitude === null || event.longitude === null) {
      return null;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }
}
