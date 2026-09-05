import { VeloStation } from './catalog.models';

/** Bornes occupées (vélos présents), bornée par la capacité si connue. */
export function veloOccupiedDocks(station: VeloStation): number | null {
  if (station.capacity === null || station.capacity <= 0) {
    return null;
  }
  return Math.min(
    station.capacity,
    Math.max(0, station.capacity - station.docksAvailable),
  );
}

export function veloOccupancyRatio(station: VeloStation): number | null {
  const occupied = veloOccupiedDocks(station);
  if (occupied === null || !station.capacity) {
    return null;
  }
  return occupied / station.capacity;
}

export function veloReportedAgo(isoDate: string | null | undefined): string | null {
  if (!isoDate) {
    return null;
  }
  const reportedAt = new Date(isoDate).getTime();
  if (Number.isNaN(reportedAt)) {
    return null;
  }
  const elapsedMs = Date.now() - reportedAt;
  if (elapsedMs < 60_000) {
    return 'à l’instant';
  }
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 60) {
    return `il y a ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `il y a ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return `il y a ${days} j`;
}

export function veloCanRent(station: VeloStation): boolean {
  return station.isRenting && station.bikesAvailable > 0;
}

export function veloCanReturn(station: VeloStation): boolean {
  return station.isReturning && station.docksAvailable > 0;
}
