import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, ParkingLot } from '../../core/catalog.models';
import { ParkingApi } from '../../core/parking-api';

@Component({
  selector: 'app-parking-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './parking-page.html',
  styleUrl: './parking-page.scss',
})
export class ParkingPage implements OnInit {
  private readonly parkingApi = inject(ParkingApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly catalog = signal<CatalogResponse<ParkingLot> | null>(null);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    const parkingId = this.route.snapshot.paramMap.get('parkingId');
    if (!parkingId) {
      this.loadError.set('Parking introuvable.');
      return;
    }
    this.parkingApi.getLot(parkingId).subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Donnée temporairement indisponible.'),
    });
  }

  protected mapsUrl(lot: ParkingLot): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${lot.latitude},${lot.longitude}`;
  }

  protected euro(amount: number | null): string {
    if (amount === null) {
      return '—';
    }
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  }
}
