import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
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
  protected readonly galleryIndex = signal(0);

  protected readonly galleryImages = computed(() => {
    const event = this.catalog()?.data;
    if (!event) {
      return [];
    }
    const images: string[] = [];
    const seen = new Set<string>();
    const push = (url: string | null | undefined): void => {
      const trimmed = url?.trim();
      if (!trimmed || seen.has(trimmed)) {
        return;
      }
      seen.add(trimmed);
      images.push(trimmed);
    };
    push(event.imageUrlLarge || event.imageUrl);
    for (const url of this.extractHtmlImages(event.longDescription ?? '')) {
      push(url);
    }
    return images;
  });

  protected readonly ticketUrl = computed(() => {
    const event = this.catalog()?.data;
    if (!event) {
      return null;
    }
    return event.registrationUrl || event.bookingUrl || null;
  });

  protected readonly usefulLinks = computed(() => {
    const event = this.catalog()?.data;
    if (!event) {
      return [];
    }
    const ticket = this.ticketUrl();
    const links = [...(event.links ?? [])];
    if (event.onlineAccessLink) {
      links.push(event.onlineAccessLink);
    }
    return [...new Set(links)].filter((link) => link !== ticket);
  });

  ngOnInit(): void {
    const eventId = this.route.snapshot.paramMap.get('eventId');
    if (!eventId) {
      this.loadError.set('Événement introuvable.');
      return;
    }
    this.eventsApi.getEvent(eventId).subscribe({
      next: (payload) => {
        this.catalog.set(payload);
        this.galleryIndex.set(0);
      },
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

  protected linkLabel(url: string): string {
    try {
      const host = new URL(url).hostname.replace(/^www\./, '');
      return host;
    } catch {
      return 'Lien';
    }
  }

  protected showPrevImage(): void {
    const total = this.galleryImages().length;
    if (total <= 1) {
      return;
    }
    this.galleryIndex.update((index) => (index - 1 + total) % total);
  }

  protected showNextImage(): void {
    const total = this.galleryImages().length;
    if (total <= 1) {
      return;
    }
    this.galleryIndex.update((index) => (index + 1) % total);
  }

  protected selectImage(index: number): void {
    this.galleryIndex.set(index);
  }

  private extractHtmlImages(html: string): string[] {
    if (!html.includes('<img')) {
      return [];
    }
    const matches = html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi);
    return [...matches]
      .map((match) => match[1])
      .filter((url) => url.startsWith('http'));
  }
}
