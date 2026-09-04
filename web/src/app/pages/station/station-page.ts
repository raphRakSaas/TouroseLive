import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, VeloStation } from '../../core/catalog.models';
import { VeloApi } from '../../core/velo-api';

@Component({
  selector: 'app-station-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './station-page.html',
  styleUrl: './station-page.scss',
})
export class StationPage implements OnInit {
  private readonly veloApi = inject(VeloApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly catalog = signal<CatalogResponse<VeloStation> | null>(null);
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    const stationId = this.route.snapshot.paramMap.get('stationId');
    if (!stationId) {
      this.loadError.set('Station introuvable.');
      return;
    }
    this.veloApi.getStation(stationId).subscribe({
      next: (payload) => this.catalog.set(payload),
      error: () => this.loadError.set('Donnée temporairement indisponible.'),
    });
  }
}
