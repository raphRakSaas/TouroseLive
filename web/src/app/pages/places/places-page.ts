import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CatalogResponse, Place, PlaceKind } from '../../core/catalog.models';
import { PlacesApi } from '../../core/places-api';

@Component({
  selector: 'app-places-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './places-page.html',
  styleUrl: './places-page.scss',
})
export class PlacesPage implements OnInit, OnDestroy {
  private readonly placesApi = inject(PlacesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private photoPollHandle: number | null = null;
  private photoPollCount = 0;

  protected readonly kinds: Array<{ id: PlaceKind | 'all'; label: string }> = [
    { id: 'all', label: 'Tous' },
    { id: 'museum', label: 'Musées' },
    { id: 'heritage', label: 'Patrimoine' },
    { id: 'gallery', label: 'Galeries' },
    { id: 'theatre', label: 'Théâtres' },
    { id: 'playground', label: 'Aires de jeux' },
    { id: 'garden', label: 'Jardins' },
    { id: 'walk', label: 'Balades' },
  ];

  protected readonly selectedKind = signal<PlaceKind | 'all'>('all');
  protected readonly catalog = signal<CatalogResponse<Place[]> | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly visibleCount = signal(24);

  protected readonly visiblePlaces = computed(() =>
    (this.catalog()?.data ?? []).slice(0, this.visibleCount()),
  );

  ngOnInit(): void {
    const kindParam = this.route.snapshot.queryParamMap.get('kind');
    const kind = this.parseKind(kindParam);
    this.selectedKind.set(kind);
    this.loadPlaces(kind);
    this.photoPollHandle = window.setInterval(() => {
      this.photoPollCount += 1;
      this.loadPlaces(this.selectedKind(), true);
      if (this.photoPollCount >= 24) {
        this.clearPhotoPoll();
      }
    }, 2500);
  }

  ngOnDestroy(): void {
    this.clearPhotoPoll();
  }

  protected setKind(kind: PlaceKind | 'all'): void {
    this.selectedKind.set(kind);
    this.visibleCount.set(24);
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { kind: kind === 'all' ? null : kind },
      queryParamsHandling: 'merge',
    });
    this.loadPlaces(kind);
  }

  protected showMore(): void {
    this.visibleCount.update((count) => count + 24);
  }

  protected kindLabel(kind: PlaceKind): string {
    return this.kinds.find((item) => item.id === kind)?.label ?? kind;
  }

  protected mapsUrl(place: Place): string | null {
    if (place.latitude === null || place.longitude === null) {
      return null;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }

  private parseKind(value: string | null): PlaceKind | 'all' {
    if (!value || value === 'all') {
      return 'all';
    }
    const match = this.kinds.find((item) => item.id === value);
    return (match?.id as PlaceKind | 'all') ?? 'all';
  }

  private loadPlaces(kind: PlaceKind | 'all', quiet = false): void {
    if (!quiet) {
      this.loadError.set(null);
    }
    this.placesApi.listPlaces(kind).subscribe({
      next: (payload) => {
        this.catalog.set(payload);
        const withPhoto = payload.data.filter((place) => place.imageUrl).length;
        if (withPhoto > payload.data.length * 0.55) {
          this.clearPhotoPoll();
        }
      },
      error: () => {
        if (!quiet) {
          this.loadError.set('Lieux temporairement indisponibles.');
        }
      },
    });
  }

  private clearPhotoPoll(): void {
    if (this.photoPollHandle !== null) {
      window.clearInterval(this.photoPollHandle);
      this.photoPollHandle = null;
    }
  }
}
