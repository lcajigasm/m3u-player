import { parseM3U } from '../../src/lib/m3u/parser';
import { normalizePlaylist, selectBestSources } from '../../src/lib/m3u/normalize';

describe('Normalization', () => {
  const input = `#EXTM3U\n#EXTINF:-1 tvg-id=ch1 tvg-name=Alpha group-title=News,Alpha\nhttp://a.com/live/alpha.m3u8\n#EXTINF:-1 tvg-id=ch1 tvg-name=Alpha group-title=News catchup=vod catchup-source=http://catch,Alpha\nhttp://a.com/live/alpha2.m3u8\n#EXTINF:-1 tvg-name=Alpha,Alpha\nhttp://a.com/live/alpha2.m3u8`;

  test('deduplicates by URL and ranks best', () => {
    const pl = parseM3U(input);
    const norm = normalizePlaylist(pl, { preferCatchup: true, preferLogo: true, preferGroup: 'News' });
    expect(norm.channels.size).toBeGreaterThan(0);
    for (const [, sources] of norm.channels) {
      // deduped same URL
      const urls = new Set(sources.map((s) => s.url));
      expect(urls.size).toBe(sources.length);
      // best first
      for (let i = 1; i < sources.length; i++) {
        expect(sources[i - 1].score).toBeGreaterThanOrEqual(sources[i].score);
      }
    }
    const best = selectBestSources(norm);
    expect(best.size).toBe(norm.channels.size);
  });
});


