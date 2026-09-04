import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, Place } from '../../core/catalog.models';
import { PlacesApi } from '../../core/places-api';

@Component({
  selector: 'app-place-detail-page',
  imports: [RouterLink],
  templateUrl: './place-detail-page.html',
  styleUrl: './place-detail-page.scss',
})
export class PlaceDetailPage implements OnInit {
  private readonly placesApi = inject(PlacesApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly catalog = signal<CatalogResponse<Place> | null>(null);
  protected readonly loadError = signal<string | null>(null);

  private readonly kindLabels: Record<Place['kind'], string> = {
    museum: 'Musée',
    gallery: 'Galerie',
    theatre: 'Théâtre',
    playground: 'Aire de jeux',
    garden: 'Jardin',
    walk: 'Balade',
    heritage: 'Patrimoine',
  };

  ngOnInit(): void {
    const placeId = this.route.snapshot.paramMap.get('placeId');
    if (!placeId) {
      this.loadError.set('Lieu introuvable.');
      return;
    }
    this.placesApi.getPlace(placeId).subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Lieu temporairement indisponible.'),
    });
  }

  protected kindLabel(kind: Place['kind']): string {
    return this.kindLabels[kind];
  }

  protected mapsUrl(place: Place): string | null {
    if (place.latitude === null || place.longitude === null) {
      return null;
    }
    return `https://www.google.com/maps/dir/?api=1&destination=${place.latitude},${place.longitude}`;
  }
}
