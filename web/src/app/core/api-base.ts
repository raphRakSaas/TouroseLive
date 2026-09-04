import { environment } from '../../environments/environment';

/** Base URL for TouRose Nest API (`/v1` in production, localhost in dev). */
export function apiBaseUrl(): string {
  return environment.apiBaseUrl.replace(/\/$/, '');
}
