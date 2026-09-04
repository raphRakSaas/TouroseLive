import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, CultureEvent } from '../../core/catalog.models';
import { EventsApi } from '../../core/events-api';

@Component({
  selector: 'app-event-detail-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './event-detail-page.html',
  styleUrl: './event-detail-page.scss',
})
export class EventDetailPage implements OnInit {
  private readonly eventsApi = inject(EventsApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly catalog = signal<CatalogResponse<CultureEvent> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) {
      this.loadError.set('Événement introuvable.');
      return;
    }
    this.eventsApi.getEvent(eventId).subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Événement temporairement indisponible.'),
    });
  }

  protected mapsUrl(event: CultureEvent): string | null {
    if (event.latitude === null || event.longitude === null) {
      return null;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
  }

  protected attendanceLabel(mode: string | null | undefined): string | null {
    if (!mode) {
      return null;
    }
    if (mode === '1' || mode.toLowerCase() === 'offline') {
      return 'Sur place';
    }
    if (mode === '2' || mode.toLowerCase() === 'online') {
      return 'En ligne';
    }
    if (mode === '3' || mode.toLowerCase() === 'mixed') {
      return 'Hybride';
    }
    return mode;
  }
}
