import { Injectable, Logger } from '@nestjs/common';
import { AirService } from '../air/air.service';
import { EventsService } from '../events/events.service';
import { PlacesService } from '../places/places.service';
import { VeloService } from '../velo/velo.service';
import { WeatherService } from '../weather/weather.service';
import {
  SuggestItemDto,
  SuggestKind,
  SuggestResponseDto,
} from './suggest.types';

type Candidate = {
  kind: SuggestKind;
  id: string;
  title: string;
  subtitle: string | null;
  link: string;
  queryParams?: Record<string, string> | null;
  imageUrl?: string | null;
  tokens: string[];
};

@Injectable()
export class SuggestService {
  private readonly logger = new Logger(SuggestService.name);

  constructor(
    private readonly eventsService: EventsService,
    private readonly placesService: PlacesService,
    private readonly weatherService: WeatherService,
    private readonly veloService: VeloService,
    private readonly airService: AirService,
  ) {}

  getStatus(): { enabled: boolean; mode: 'llm' | 'heuristic'; model: string | null } {
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    return {
      enabled: true,
      mode: apiKey ? 'llm' : 'heuristic',
      model: apiKey ? model : null,
    };
  }

  async suggest(rawPrompt: string): Promise<SuggestResponseDto> {
    const prompt = rawPrompt.trim().slice(0, 280);
    if (prompt.length < 2) {
      return {
        status: 'ok',
        mode: 'heuristic',
        reply: 'Dis-moi ce que tu cherches — ex. « concert ce soir », « balade au soleil », « vélo près du Capitole ».',
        suggestions: [],
        model: null,
      };
    }

    const candidates = await this.buildCandidates();
    const apiKey = process.env.OPENAI_API_KEY?.trim() ?? '';
    if (apiKey) {
      try {
        const llmResult = await this.suggestWithLlm(prompt, candidates, apiKey);
        if (llmResult.suggestions.length > 0) {
          return llmResult;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.warn(`LLM suggest failed, falling back to heuristic: ${message}`);
      }
    }

    return this.suggestHeuristic(prompt, candidates);
  }

  private async buildCandidates(): Promise<Candidate[]> {
    const today = this.parisToday();
    const weekLimit = this.addDays(today, 7);
    const upcomingEvents = this.eventsService.listEvents().data.filter((event) => {
      const start = event.startsOn ?? event.endsOn ?? '';
      return start !== '' && start <= weekLimit;
    });
    const themedEvents = upcomingEvents.filter((event) =>
      /concert|spectacle|festival|expo|ciné|cinema|théâtre|theatre|musique|live|humour|danse/i.test(
        [event.title, event.category, event.summary, ...(event.keywords ?? [])].join(
          ' ',
        ),
      ),
    );
    const eventPool = [
      ...themedEvents.slice(0, 28),
      ...upcomingEvents.slice(0, 36),
    ].filter(
      (event, index, list) =>
        list.findIndex((row) => row.eventId === event.eventId) === index,
    );
    const events = eventPool.slice(0, 56).map((event) => ({
      kind: 'event' as const,
      id: event.eventId,
      title: event.title,
      subtitle: [event.venueName, event.city, event.schedule]
        .filter(Boolean)
        .join(' · '),
      link: `/evenements/${encodeURIComponent(event.eventId)}`,
      imageUrl: event.imageUrl ?? null,
      tokens: this.tokenize(
        [
          event.title,
          event.summary,
          event.venueName,
          event.city,
          event.category,
          ...(event.keywords ?? []),
        ]
          .filter(Boolean)
          .join(' '),
      ),
    }));

    const places = this.placesService
      .listPlaces('all')
      .data.slice(0, 40)
      .map((place) => ({
        kind: 'place' as const,
        id: place.placeId,
        title: place.name,
        subtitle: [place.district, place.city].filter(Boolean).join(' · '),
        link: `/lieux/${encodeURIComponent(place.placeId)}`,
        imageUrl: place.imageUrl ?? null,
        tokens: this.tokenize(
          [
            place.name,
            place.kind,
            place.district,
            place.description,
            place.kind === 'museum' ? 'musee exposition culture' : '',
            place.kind === 'garden' || place.kind === 'walk'
              ? 'parc jardin balade nature'
              : '',
            place.kind === 'heritage' ? 'patrimoine histoire' : '',
            place.kind === 'theatre' || place.kind === 'gallery'
              ? 'spectacle culture expo'
              : '',
          ]
            .filter(Boolean)
            .join(' '),
        ),
      }));

    const stations = [...this.veloService.listStations().data]
      .filter((station) => station.isRenting && station.bikesAvailable > 0)
      .sort((left, right) => right.bikesAvailable - left.bikesAvailable)
      .slice(0, 12)
      .map((station) => ({
        kind: 'velo' as const,
        id: station.stationId,
        title: station.name,
        subtitle: `${station.bikesAvailable} vélos · ${station.docksAvailable} places`,
        link: `/carte`,
        queryParams: { layer: 'velo' },
        imageUrl: null,
        tokens: this.tokenize(
          [station.name, station.address, 'vélo', 'velo', 'vélô', 'bouger'].join(
            ' ',
          ),
        ),
      }));

    const weather = await this.weatherService.getForecast('capitole');
    const forecast = weather.data;
    const air = this.airService.getIndex().data;
    const contextCards: Candidate[] = [
      {
        kind: 'weather',
        id: 'weather-capitole',
        title: forecast
          ? `Météo · ${Math.round(forecast.current.temperature)}°`
          : 'Météo Toulouse',
        subtitle: forecast
          ? `${forecast.current.weatherLabel}${air ? ` · air ${air.qualityLabel}` : ''}`
          : 'Prévisions & qualité de l’air',
        link: '/meteo',
        imageUrl: null,
        tokens: this.tokenize(
          'météo meteo soleil pluie froid chaud air qualité atmo outdoor',
        ),
      },
      {
        kind: 'map',
        id: 'map-explorer',
        title: 'Explorer la carte',
        subtitle: 'Événements, Vélô, parkings, lieux',
        link: '/carte',
        queryParams: null,
        imageUrl: null,
        tokens: this.tokenize('carte map bouger explorer quartier'),
      },
    ];

    return [...events, ...places, ...stations, ...contextCards];
  }

  private async suggestWithLlm(
    prompt: string,
    candidates: Candidate[],
    apiKey: string,
  ): Promise<SuggestResponseDto> {
    const baseUrl = (
      process.env.OPENAI_BASE_URL?.trim() || 'https://api.openai.com/v1'
    ).replace(/\/$/, '');
    const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';
    const compact = candidates.map((candidate) => ({
      kind: candidate.kind,
      id: candidate.id,
      title: candidate.title,
      subtitle: candidate.subtitle,
    }));

    const system = [
      'Tu es TouRose, guide open-data de Toulouse.',
      'Tu ne inventes JAMAIS un lieu, event ou station.',
      'Tu choisis uniquement parmi les candidats JSON fournis (par id).',
      'Réponds UNIQUEMENT en JSON valide:',
      '{"reply":"phrase courte en français","picks":[{"id":"...","reason":"max 12 mots"}]}',
      'Donne 3 picks maximum, pertinents pour la demande.',
    ].join(' ');

    const user = `Demande: ${prompt}\n\nCandidats:\n${JSON.stringify(compact)}`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`OpenAI HTTP ${response.status}: ${body.slice(0, 200)}`);
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = payload.choices?.[0]?.message?.content ?? '{}';
    const parsed = JSON.parse(content) as {
      reply?: string;
      picks?: Array<{ id?: string; reason?: string }>;
    };

    const byId = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const suggestions: SuggestItemDto[] = [];
    for (const pick of parsed.picks ?? []) {
      const candidate = pick.id ? byId.get(pick.id) : undefined;
      if (!candidate) {
        continue;
      }
      suggestions.push(this.toSuggestion(candidate, pick.reason || 'Idée pour toi'));
      if (suggestions.length >= 3) {
        break;
      }
    }

    return {
      status: 'ok',
      mode: 'llm',
      reply:
        parsed.reply?.trim() ||
        'Voici quelques idées tirées de l’open data Toulouse.',
      suggestions,
      model,
    };
  }

  private suggestHeuristic(
    prompt: string,
    candidates: Candidate[],
  ): SuggestResponseDto {
    const promptTokens = this.tokenize(prompt);
    const wantsConcert = /concert|spectacle|expo|festival|cine|theatre|musique|live/i.test(
      prompt,
    );
    const wantsPlace =
      /musee|jardin|parc|patrimoine|lieu|balade|galerie|theatre/i.test(prompt);
    const wantsDrink = /boire|verre|bar|cafe|resto|restaurant|apero|apéro/i.test(
      prompt,
    );
    const eventThemeTokens = [
      'concert',
      'spectacle',
      'expo',
      'exposition',
      'festival',
      'cine',
      'cinema',
      'theatre',
      'musique',
      'live',
      'danse',
      'humour',
    ];

    const scored = candidates
      .map((candidate) => {
        let score = 0;
        for (const token of promptTokens) {
          if (
            candidate.tokens.some(
              (candidateToken) =>
                candidateToken.includes(token) || token.includes(candidateToken),
            )
          ) {
            score += 2;
          }
        }
        if (
          /soir|aujourd|ce soir|tonight/i.test(prompt) &&
          candidate.kind === 'event'
        ) {
          score += 2;
        }
        if (/velo|bike|bouger/i.test(prompt) && candidate.kind === 'velo') {
          score += 5;
        }
        if (/meteo|pluie|soleil|air/i.test(prompt) && candidate.kind === 'weather') {
          score += 5;
        }
        if (wantsPlace && candidate.kind === 'place') {
          score += 3;
        }
        if (wantsConcert && candidate.kind === 'event') {
          const themed = candidate.tokens.some((token) =>
            eventThemeTokens.some(
              (theme) => token.includes(theme) || theme.includes(token),
            ),
          );
          score += themed ? 6 : 0;
        }
        if (wantsDrink) {
          if (candidate.kind === 'map') {
            score += 4;
          }
          if (
            candidate.kind === 'event' &&
            candidate.tokens.some((token) =>
              ['concert', 'spectacle', 'live', 'soir', 'festival', 'humour'].some(
                (theme) => token.includes(theme),
              ),
            )
          ) {
            score += 3;
          }
        }
        if (candidate.kind === 'event' && candidate.imageUrl) {
          score += 0.5;
        }
        return { candidate, score };
      })
      .filter((row) => row.score > 0)
      .sort((left, right) => right.score - left.score);

    const picked = scored.slice(0, 3).map((row) => row.candidate);
    const fallback =
      picked.length > 0
        ? picked
        : candidates.filter((candidate) => candidate.kind === 'event').slice(0, 3);

    let reply = 'Voici ce que TouRose trouve dans l’open data pour ta demande.';
    if (picked.length === 0) {
      reply = 'Pas de match parfait — voici 3 idées à venir à Toulouse.';
    } else if (wantsDrink) {
      reply =
        'Pas de bars open-data — voici des pistes carte / soirée proches de ta demande.';
    }

    return {
      status: 'ok',
      mode: 'heuristic',
      reply,
      suggestions: fallback.map((candidate) =>
        this.toSuggestion(
          candidate,
          wantsDrink && candidate.kind === 'map'
            ? 'Explorer bars & lieux sur la carte'
            : 'Correspond à ta recherche',
        ),
      ),
      model: null,
    };
  }

  private toSuggestion(candidate: Candidate, reason: string): SuggestItemDto {
    return {
      kind: candidate.kind,
      id: candidate.id,
      title: candidate.title,
      subtitle: candidate.subtitle,
      reason: reason.trim().slice(0, 80),
      link: candidate.link,
      queryParams: candidate.queryParams ?? null,
      imageUrl: candidate.imageUrl ?? null,
    };
  }

  private tokenize(value: string): string[] {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length >= 3);
  }

  private parisToday(): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Europe/Paris',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  private addDays(isoDate: string, days: number): string {
    const date = new Date(`${isoDate}T12:00:00`);
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  }
}
