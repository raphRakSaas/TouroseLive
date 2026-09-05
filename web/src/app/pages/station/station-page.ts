import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CatalogResponse, VeloStation } from '../../core/catalog.models';
import { VeloApi } from '../../core/velo-api';
import {
  veloCanRent,
  veloCanReturn,
  veloOccupiedDocks,
  veloOccupancyRatio,
  veloReportedAgo,
} from '../../core/velo-station.utils';
import { frenchTitleCase } from '../../core/french-title-case';

@Component({
  selector: 'app-station-page',
  imports: [DatePipe, RouterLink],
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
      next: (payload) => {
        if (!payload.data) {
          this.loadError.set('Station introuvable.');
        }
        this.catalog.set(payload);
      },
      error: () => this.loadError.set('Donnée temporairement indisponible.'),
    });
  }

  protected mapsUrl(station: VeloStation): string {
    return `https://www.google.com/maps/dir/?api=1&destination=${station.latitude},${station.longitude}`;
  }

  protected canRent(station: VeloStation): boolean {
    return veloCanRent(station);
  }

  protected canReturn(station: VeloStation): boolean {
    return veloCanReturn(station);
  }

  protected occupiedDocks(station: VeloStation): number | null {
    return veloOccupiedDocks(station);
  }

  protected occupancyPercent(station: VeloStation): number | null {
    const ratio = veloOccupancyRatio(station);
    return ratio === null ? null : Math.round(ratio * 100);
  }

  protected reportedAgo(station: VeloStation): string | null {
    return veloReportedAgo(station.lastReportedAt);
  }

  protected stationTitle(name: string): string {
    return frenchTitleCase(name);
  }
}
