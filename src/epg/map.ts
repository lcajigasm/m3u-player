/*
 * EPG Map
 * - Maps playlist channels to XMLTV channels by tvg-id first, then by name using Levenshtein and optional country boost
 */

export type PlaylistChannel = {
  id?: string;
  name: string;
  attrs?: Record<string, string>;
};

export type Candidate = {
  xmltvId: string;
  name: string;
  country?: string | null;
};

export type MappingResult = {
  map: Map<string, string>; // playlistKey -> xmltvId
  coverage: number; // percentage 0..100
};

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = new Array(n + 1).fill(0);
  for (let j = 0; j <= n; j++) dp[j] = j;
  for (let i = 1; i <= m; i++) {
    let prev = i - 1;
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = tmp;
    }
  }
  return dp[n];
}

function similarity(a: string, b: string): number {
  const an = normalizeName(a);
  const bn = normalizeName(b);
  const maxLen = Math.max(an.length, bn.length) || 1;
  const dist = levenshtein(an, bn);
  return 1 - dist / maxLen; // 0..1
}

export function mapChannels(
  playlist: PlaylistChannel[],
  xmltvChannels: Map<string, { id: string; name: string; country?: string | null }>,
  options?: { countryAttrKey?: string; minSimilarity?: number }
): MappingResult {
  const countryAttrKey = options?.countryAttrKey || 'tvg-country';
  const minSimilarity = options?.minSimilarity ?? 0.6;

  const xmltvArr: Candidate[] = Array.from(xmltvChannels.values()).map((c) => ({
    xmltvId: c.id,
    name: c.name,
    country: c.country ?? null,
  }));

  const result = new Map<string, string>();
  let matched = 0;

  for (const ch of playlist) {
    const key = (ch.attrs?.['tvg-id'] || ch.id || ch.name).trim();
    if (!key) continue;

    // 1) Exact tvg-id match
    if (ch.attrs?.['tvg-id']) {
      const id = ch.attrs['tvg-id'];
      if (xmltvChannels.has(id)) {
        result.set(key, id);
        matched++;
        continue;
      }
    }

    // 2) Name similarity with optional country boost
    const country = ch.attrs?.[countryAttrKey]?.toUpperCase() || null;
    let best: { id: string; score: number } | null = null;
    for (const cand of xmltvArr) {
      let score = similarity(ch.name, cand.name);
      if (country && cand.country && cand.country.toUpperCase() === country) {
        score += 0.1; // small boost if same country
      }
      if (!best || score > best.score) best = { id: cand.xmltvId, score };
    }
    if (best && best.score >= minSimilarity) {
      result.set(key, best.id);
      matched++;
    }
  }

  const coverage = playlist.length > 0 ? Math.round((matched / playlist.length) * 100) : 0;
  return { map: result, coverage };
}


