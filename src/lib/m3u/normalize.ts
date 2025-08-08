import { M3UPlaylist, M3UTrack, getUrlBase, slugifyChannelName } from './parser';

export interface NormalizedSource extends M3UTrack {
  channelKey: string;
  urlBase: string;
  score: number; // For picking best source
}

export interface NormalizedPlaylist {
  header: M3UPlaylist['header'];
  channels: Map<string, NormalizedSource[]>; // key -> list of sources
}

export interface NormalizeOptions {
  preferCatchup?: boolean;
  preferLogo?: boolean;
  preferGroup?: string; // Boost score for group-title match
}

function computeChannelKey(track: M3UTrack): { channelKey: string; urlBase: string } {
  const id = (track.attrs['tvg-id'] || '').trim();
  const byName = slugifyChannelName(track.attrs['tvg-name'] || track.name || '');
  const urlBase = getUrlBase(track.url);
  const key = `${id || byName}::${urlBase}`;
  return { channelKey: key, urlBase };
}

function scoreSource(track: M3UTrack, options: NormalizeOptions): number {
  let score = 0;
  if (options.preferCatchup) {
    if (track.attrs['catchup'] && track.attrs['catchup'] !== 'default') score += 2;
    if (track.attrs['catchup-source']) score += 1;
  }
  if (options.preferLogo && track.attrs['tvg-logo']) score += 1.5;
  if (options.preferGroup && track.attrs['group-title']) {
    if (track.attrs['group-title'].toLowerCase() === options.preferGroup.toLowerCase()) score += 1;
  }
  // Prefer explicit tvg-id and tvg-name presence
  if (track.attrs['tvg-id']) score += 1;
  if (track.attrs['tvg-name']) score += 0.5;
  // Slightly prefer shorter URLs (heuristic for less proxying)
  score += Math.max(0, 2 - Math.log10(Math.max(10, track.url.length)));
  return score;
}

export function normalizePlaylist(playlist: M3UPlaylist, options: NormalizeOptions = {}): NormalizedPlaylist {
  const channels = new Map<string, NormalizedSource[]>();
  for (const track of playlist.tracks) {
    const { channelKey, urlBase } = computeChannelKey(track);
    const source: NormalizedSource = {
      ...track,
      channelKey,
      urlBase,
      score: scoreSource(track, options),
    };
    if (!channels.has(channelKey)) channels.set(channelKey, []);
    channels.get(channelKey)!.push(source);
  }
  // Deduplicate exact same URLs, keep highest score, stable order otherwise
  for (const [key, sources] of channels) {
    const byUrl = new Map<string, NormalizedSource>();
    for (const s of sources) {
      const existing = byUrl.get(s.url);
      if (!existing || s.score > existing.score) byUrl.set(s.url, s);
    }
    const unique = Array.from(byUrl.values());
    unique.sort((a, b) => b.score - a.score);
    channels.set(key, unique);
  }
  return { header: playlist.header, channels };
}

export function selectBestSources(normalized: NormalizedPlaylist): Map<string, NormalizedSource> {
  const best = new Map<string, NormalizedSource>();
  for (const [key, sources] of normalized.channels) {
    best.set(key, sources[0]);
  }
  return best;
}

export default normalizePlaylist;


