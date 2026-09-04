/**
 * Resolve real place photos from Wikidata / Wikimedia Commons.
 * Never returns map tiles. Returns null when no confident match exists.
 */

const USER_AGENT =
  'TouRose/0.1 (https://github.com/raphRakSaas/TouroseLive; open-data reuse)';

const STOP_WORDS = new Set([
  'aire',
  'jeux',
  'jeu',
  'de',
  'du',
  'des',
  'la',
  'le',
  'les',
  'et',
  'en',
  'au',
  'aux',
  'sur',
  'sous',
  'parc',
  'square',
  'jardin',
  'jardins',
  'musee',
  'museum',
  'theatre',
  'salle',
  'galeries',
  'galerie',
  'espace',
  'centre',
  'toulouse',
  'metropole',
  'commune',
  'quartier',
  'rue',
  'place',
  'avenue',
  'boulevard',
  'impasse',
  'allee',
  'chemin',
  'partage',
  'partages',
  'balade',
  'balades',
  'monument',
  'historique',
  'classe',
  'inscrit',
  'fontaine',
  'vue',
  'ouest',
  'est',
  'nord',
  'sud',
]);

const ARTWORK_PENALTY = [
  'joconde',
  'tableau',
  'peinture',
  'portrait',
  'huile',
  'sculpture',
  'statue',
  'détail',
  'detail',
  'toile',
  'dessin',
  'esquisse',
  'theodule',
  'ribott',
  'ribot',
  'musee des augustins - joconde',
];

const PLACE_PHOTO_BOOST = [
  '(toulouse)',
  'façade',
  'facade',
  'extérieur',
  'exterieur',
  'entrée',
  'entree',
  'clocher',
  'vue de',
  'aire de jeux',
  'jardin',
  'square',
  'place ',
];

export type ResolvedMedia = {
  imageUrl: string;
  imageSource: 'wikidata' | 'wikipedia' | 'commons';
};

type WikiSearchHit = {
  id: string;
  label?: string;
  description?: string;
};

type CommonsSearchHit = {
  title: string;
};

export class PlaceMediaResolver {
  private readonly cache = new Map<string, ResolvedMedia | null>();
  private commonsCatalog: string[] = [];
  private catalogReady = false;
  private lastRequestAt = 0;
  private cooldownUntil = 0;
  private consecutiveRateLimits = 0;

  /** True when Wikimedia asked us to slow down heavily. */
  isCoolingDown(): boolean {
    return Date.now() < this.cooldownUntil;
  }

  cooldownRemainingMs(): number {
    return Math.max(0, this.cooldownUntil - Date.now());
  }

  async warmCatalog(): Promise<void> {
    if (this.catalogReady) {
      return;
    }
    // Keep this light — a large Commons warm-up burns the rate limit
    // before place photos can resolve.
    const queries = [
      'musée Toulouse',
      'basilique Toulouse',
      'théâtre Toulouse',
      'jardin Toulouse',
    ];
    const titles = new Set<string>();
    for (const query of queries) {
      if (this.isCoolingDown()) {
        break;
      }
      try {
        const pages = await this.searchCommonsTitles(query, 20);
        for (const title of pages) {
          titles.add(title);
        }
      } catch {
        break;
      }
      await this.throttle(900);
    }
    this.commonsCatalog = [...titles];
    this.catalogReady = true;
  }

  async resolve(placeName: string, kind: string): Promise<ResolvedMedia | null> {
    const cacheKey = `${kind}|${placeName.toLowerCase().trim()}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    // Prefer Wikidata / Wikipedia first (fewer calls, better matches).
    // Commons catalog warm-up is optional and skipped while rate-limited.
    if (!this.catalogReady && !this.isCoolingDown()) {
      void this.warmCatalog();
    }

    const preferWikipediaRest =
      kind === 'museum' ||
      kind === 'heritage' ||
      kind === 'theatre' ||
      kind === 'gallery';

    const resolved =
      (this.catalogReady
        ? await this.fromCatalog(placeName, kind)
        : null) ??
      (preferWikipediaRest
        ? await this.fromWikipediaRest(placeName)
        : null) ??
      (await this.fromWikidata(placeName)) ??
      (await this.fromWikipedia(placeName)) ??
      (await this.fromCommonsSearch(placeName, kind));

    this.cache.set(cacheKey, resolved);
    return resolved;
  }

  private async fromCatalog(
    placeName: string,
    kind: string,
  ): Promise<ResolvedMedia | null> {
    let bestTitle: string | null = null;
    let bestScore = 0;
    for (const title of this.commonsCatalog) {
      const ranked = this.rankCommonsTitle(placeName, title, kind);
      if (ranked > bestScore) {
        bestScore = ranked;
        bestTitle = title;
      }
    }
    const threshold = kind === 'playground' || kind === 'garden' ? 5.5 : 6.5;
    if (!bestTitle || bestScore < threshold) {
      return null;
    }
    const imageUrl = await this.commonsFileUrl(bestTitle);
    return imageUrl ? { imageUrl, imageSource: 'commons' } : null;
  }

  private async fromWikidata(placeName: string): Promise<ResolvedMedia | null> {
    const searches = [`${placeName} Toulouse`, placeName];
    for (const search of searches) {
      await this.throttle(100);
      const params = new URLSearchParams({
        action: 'wbsearchentities',
        search,
        language: 'fr',
        uselang: 'fr',
        type: 'item',
        limit: '8',
        format: 'json',
        origin: '*',
      });
      const payload = await this.fetchJson<{ search?: WikiSearchHit[] }>(
        `https://www.wikidata.org/w/api.php?${params.toString()}`,
      );
      const hits = payload.search ?? [];
      const best = hits.find((hit) => this.isToulouseEntity(hit, placeName));
      if (!best?.id) {
        continue;
      }

      await this.throttle(100);
      const entityParams = new URLSearchParams({
        action: 'wbgetentities',
        ids: best.id,
        props: 'claims|sitelinks',
        languages: 'fr',
        format: 'json',
        origin: '*',
      });
      const entities = await this.fetchJson<{
        entities?: Record<
          string,
          {
            claims?: Record<
              string,
              Array<{
                mainsnak?: { datavalue?: { value?: string } };
              }>
            >;
            sitelinks?: Record<string, { title?: string }>;
          }
        >;
      }>(`https://www.wikidata.org/w/api.php?${entityParams.toString()}`);

      const entity = entities.entities?.[best.id];
      const fileName = entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (fileName) {
        const imageUrl = await this.commonsFileUrl(fileName);
        if (imageUrl) {
          return { imageUrl, imageSource: 'wikidata' };
        }
      }

      const wikiTitle = entity?.sitelinks?.frwiki?.title;
      if (wikiTitle) {
        const thumb = await this.wikipediaThumbByTitle(wikiTitle);
        if (thumb) {
          return { imageUrl: thumb, imageSource: 'wikipedia' };
        }
      }
    }
    return null;
  }

  private async fromWikipedia(placeName: string): Promise<ResolvedMedia | null> {
    await this.throttle(100);
    const params = new URLSearchParams({
      action: 'query',
      generator: 'search',
      gsrsearch: `${placeName} Toulouse`,
      gsrlimit: '6',
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '480',
      format: 'json',
      origin: '*',
    });
    const payload = await this.fetchJson<{
      query?: {
        pages?: Record<
          string,
          { title?: string; thumbnail?: { source?: string }; index?: number }
        >;
      };
    }>(`https://fr.wikipedia.org/w/api.php?${params.toString()}`);

    const pages = Object.values(payload.query?.pages ?? {}).sort(
      (left, right) => (left.index ?? 99) - (right.index ?? 99),
    );

    for (const page of pages) {
      if (!page.title || !page.thumbnail?.source) {
        continue;
      }
      if (this.matchScore(placeName, page.title) < 0.55) {
        continue;
      }
      if (
        this.titleMentionsToulouse(page.title) ||
        this.matchScore(placeName, page.title) >= 0.75
      ) {
        return {
          imageUrl: this.stripUtm(page.thumbnail.source),
          imageSource: 'wikipedia',
        };
      }
    }
    return null;
  }

  private async fromCommonsSearch(
    placeName: string,
    kind: string,
  ): Promise<ResolvedMedia | null> {
    const queries = this.commonsQueries(placeName, kind);
    let bestTitle: string | null = null;
    let bestScore = 0;

    for (const query of queries) {
      await this.throttle(120);
      const titles = await this.searchCommonsTitles(query, 10);
      for (const title of titles) {
        const ranked = this.rankCommonsTitle(placeName, title, kind);
        if (ranked > bestScore) {
          bestScore = ranked;
          bestTitle = title;
        }
      }
    }

    const threshold = kind === 'playground' ? 5.2 : 6;
    if (!bestTitle || bestScore < threshold) {
      return null;
    }
    const imageUrl = await this.commonsFileUrl(bestTitle);
    return imageUrl ? { imageUrl, imageSource: 'commons' } : null;
  }

  private async searchCommonsTitles(
    query: string,
    limit: number,
  ): Promise<string[]> {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      srnamespace: '6',
      srlimit: String(Math.min(limit, 50)),
      format: 'json',
      origin: '*',
    });
    const payload = await this.fetchJson<{
      query?: { search?: CommonsSearchHit[] };
    }>(`https://commons.wikimedia.org/w/api.php?${params.toString()}`);
    return (payload.query?.search ?? []).map((hit) =>
      hit.title.replace(/^File:/i, ''),
    );
  }

  private commonsQueries(placeName: string, kind: string): string[] {
    const cleaned = placeName.trim();
    const queries = [`"${cleaned}" Toulouse`, `${cleaned} Toulouse`];
    if (kind === 'playground') {
      queries.push(`aire de jeux ${cleaned} Toulouse`);
    }
    if (kind === 'garden') {
      queries.push(`jardin ${cleaned} Toulouse`);
    }
    if (kind === 'heritage') {
      queries.push(`${cleaned} Toulouse`);
    }
    return queries;
  }

  private rankCommonsTitle(
    placeName: string,
    title: string,
    kind: string,
  ): number {
    if (!this.titleMentionsToulouse(title)) {
      return 0;
    }
    const lower = title.toLowerCase();
    for (const bad of ARTWORK_PENALTY) {
      if (lower.includes(bad)) {
        return 0;
      }
    }

    const tokenScore = this.matchScore(placeName, title);
    if (tokenScore < 0.35) {
      return 0;
    }

    let score = tokenScore * 10;
    for (const boost of PLACE_PHOTO_BOOST) {
      if (lower.includes(boost)) {
        score += 1.4;
      }
    }
    if (kind === 'playground' && lower.includes('aire de jeux')) {
      score += 2;
    }
    if (kind === 'garden' && lower.includes('jardin')) {
      score += 1.5;
    }
    if (kind === 'museum' && lower.includes('musée')) {
      score += 1;
    }
    // Prefer filenames that start with the place (street photography style)
    const firstTokens = this.tokens(placeName).slice(0, 2);
    if (
      firstTokens.length > 0 &&
      firstTokens.every((token) => lower.includes(token))
    ) {
      score += 1.5;
    }
    return score;
  }

  private async wikipediaThumbByTitle(title: string): Promise<string | null> {
    await this.throttle(80);
    const params = new URLSearchParams({
      action: 'query',
      titles: title,
      prop: 'pageimages',
      piprop: 'thumbnail',
      pithumbsize: '480',
      format: 'json',
      origin: '*',
    });
    const payload = await this.fetchJson<{
      query?: {
        pages?: Record<string, { thumbnail?: { source?: string } }>;
      };
    }>(`https://fr.wikipedia.org/w/api.php?${params.toString()}`);
    const page = Object.values(payload.query?.pages ?? {})[0];
    return page?.thumbnail?.source
      ? this.stripUtm(page.thumbnail.source)
      : null;
  }

  private async commonsFileUrl(fileName: string): Promise<string | null> {
    const clean = fileName.replace(/^File:/i, '').trim();
    if (!clean) {
      return null;
    }
    // Special:FilePath avoids an extra Action API call (main 429 source).
    return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(clean)}?width=640`;
  }

  private async fromWikipediaRest(
    placeName: string,
  ): Promise<ResolvedMedia | null> {
    const candidates = [
      placeName,
      `${placeName} (Toulouse)`,
      `${placeName} de Toulouse`,
    ];
    for (const title of candidates) {
      if (this.isCoolingDown()) {
        return null;
      }
      await this.throttle(250);
      const url = `https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
        title.replace(/ /g, '_'),
      )}`;
      try {
        const payload = await this.fetchJson<{
          title?: string;
          thumbnail?: { source?: string };
          originalimage?: { source?: string };
          description?: string;
          extract?: string;
        }>(url);
        const image =
          payload.thumbnail?.source || payload.originalimage?.source || null;
        if (!image || !payload.title) {
          continue;
        }
        const blob = `${payload.title} ${payload.description ?? ''} ${payload.extract ?? ''}`.toLowerCase();
        if (
          !blob.includes('toulouse') &&
          this.matchScore(placeName, payload.title) < 0.8
        ) {
          continue;
        }
        if (this.matchScore(placeName, payload.title) < 0.5) {
          continue;
        }
        return {
          imageUrl: this.stripUtm(image),
          imageSource: 'wikipedia',
        };
      } catch {
        continue;
      }
    }
    return null;
  }

  private isToulouseEntity(hit: WikiSearchHit, placeName: string): boolean {
    const blob = `${hit.label ?? ''} ${hit.description ?? ''}`.toLowerCase();
    const inToulouse =
      blob.includes('toulouse') ||
      blob.includes('haute-garonne') ||
      blob.includes('occitanie');
    if (!inToulouse) {
      return false;
    }
    return this.matchScore(placeName, hit.label ?? '') >= 0.4;
  }

  private titleMentionsToulouse(title: string): boolean {
    return title.toLowerCase().includes('toulouse');
  }

  matchScore(placeName: string, candidate: string): number {
    const placeTokens = this.tokens(placeName);
    const candidateTokens = new Set(this.tokens(candidate));
    if (placeTokens.length === 0) {
      return 0;
    }
    let hits = 0;
    for (const token of placeTokens) {
      if (candidateTokens.has(token)) {
        hits += 1;
        continue;
      }
      for (const candidateToken of candidateTokens) {
        if (
          candidateToken.includes(token) ||
          token.includes(candidateToken)
        ) {
          hits += 0.85;
          break;
        }
      }
    }
    return hits / placeTokens.length;
  }

  private tokens(value: string): string[] {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/[\s-]+/)
      .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
  }

  private stripUtm(url: string): string {
    try {
      const parsed = new URL(url);
      parsed.searchParams.delete('utm_source');
      parsed.searchParams.delete('utm_campaign');
      parsed.searchParams.delete('utm_content');
      return parsed.toString();
    } catch {
      return url;
    }
  }

  private async throttle(minGapMs: number): Promise<void> {
    const cooldownWait = this.cooldownUntil - Date.now();
    if (cooldownWait > 0) {
      await new Promise((resolve) => setTimeout(resolve, cooldownWait));
    }
    // Wikimedia rate-limits aggressively; keep a wide default gap.
    const gapMs = Math.max(minGapMs, 900);
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < gapMs) {
      await new Promise((resolve) => setTimeout(resolve, gapMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  private async fetchJson<T>(url: string, attempt = 1): Promise<T> {
    const response = await fetch(url, {
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'application/json',
      },
    });
    if (response.status === 429 || response.status === 503) {
      this.consecutiveRateLimits += 1;
      const backoffMs = Math.min(60_000, 4_000 * 2 ** (attempt - 1));
      this.cooldownUntil = Date.now() + backoffMs;
      if (attempt >= 3 || this.consecutiveRateLimits >= 8) {
        throw new Error(`${url} → HTTP ${response.status}`);
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return this.fetchJson<T>(url, attempt + 1);
    }
    if (!response.ok) {
      throw new Error(`${url} → HTTP ${response.status}`);
    }
    const text = await response.text();
    if (text.startsWith('You are making too many requests')) {
      this.consecutiveRateLimits += 1;
      const backoffMs = Math.min(60_000, 5_000 * 2 ** (attempt - 1));
      this.cooldownUntil = Date.now() + backoffMs;
      if (attempt >= 3 || this.consecutiveRateLimits >= 8) {
        throw new Error('Wikimedia rate limit');
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      return this.fetchJson<T>(url, attempt + 1);
    }
    this.consecutiveRateLimits = 0;
    return JSON.parse(text) as T;
  }
}
