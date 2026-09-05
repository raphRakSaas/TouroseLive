import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { apiBaseUrl } from './api-base';

export type SuggestKind = 'event' | 'place' | 'velo' | 'weather' | 'map';

export interface SuggestItem {
  kind: SuggestKind;
  id: string | null;
  title: string;
  subtitle: string | null;
  reason: string;
  link: string;
  queryParams?: Record<string, string> | null;
  imageUrl?: string | null;
}

export interface SuggestResponse {
  status: 'ok' | 'unavailable' | 'disabled';
  mode: 'llm' | 'heuristic';
  reply: string;
  suggestions: SuggestItem[];
  model: string | null;
}

export interface SuggestStatus {
  enabled: boolean;
  mode: 'llm' | 'heuristic';
  model: string | null;
}

@Injectable({ providedIn: 'root' })
export class SuggestApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = apiBaseUrl();

  status() {
    return this.http.get<SuggestStatus>(`${this.baseUrl}/suggest/status`);
  }

  suggest(prompt: string) {
    return this.http.post<SuggestResponse>(`${this.baseUrl}/suggest`, {
      prompt,
    });
  }
}
