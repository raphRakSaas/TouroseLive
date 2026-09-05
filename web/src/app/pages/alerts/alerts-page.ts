import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CatalogResponse, TisseoAlert } from '../../core/catalog.models';
import { TisseoApi } from '../../core/tisseo-api';

@Component({
  selector: 'app-alerts-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './alerts-page.html',
  styleUrl: './alerts-page.scss',
})
export class AlertsPage implements OnInit {
  private readonly tisseoApi = inject(TisseoApi);

  protected readonly catalog = signal<CatalogResponse<TisseoAlert[]> | null>(
    null,
  );
  protected readonly loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.tisseoApi.listAlerts().subscribe({
      next: (payload) => {
        this.catalog.set(payload);
        if (payload.status === 'unavailable') {
          this.loadError.set('Alertes Tisséo temporairement indisponibles.');
        }
      },
      error: () =>
        this.loadError.set('Alertes Tisséo temporairement indisponibles.'),
    });
  }

  protected severityLabel(severity: TisseoAlert['severity']): string {
    switch (severity) {
      case 'severe':
        return 'Forte';
      case 'warning':
        return 'Attention';
      case 'info':
        return 'Info';
      default:
        return 'Alerte';
    }
  }
}
