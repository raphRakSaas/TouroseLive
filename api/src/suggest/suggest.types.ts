export type SuggestKind = 'event' | 'place' | 'velo' | 'weather' | 'map';

export interface SuggestRequestDto {
  prompt: string;
}

export interface SuggestItemDto {
  kind: SuggestKind;
  id: string | null;
  title: string;
  subtitle: string | null;
  reason: string;
  link: string;
  queryParams?: Record<string, string> | null;
  imageUrl?: string | null;
}

export interface SuggestResponseDto {
  status: 'ok' | 'unavailable' | 'disabled';
  mode: 'llm' | 'heuristic';
  reply: string;
  suggestions: SuggestItemDto[];
  model: string | null;
}
