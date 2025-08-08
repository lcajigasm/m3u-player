import { parseM3U } from '../../src/lib/m3u/parser';

function generateLargeM3U(lines: number): string {
  const header = '#EXTM3U x-tvg-url="http://epg"';
  const rows: string[] = [header];
  for (let i = 0; i < lines; i++) {
    rows.push(`#EXTINF:-1 tvg-id="id${i}" tvg-name="Channel ${i}" tvg-logo="l${i}.png" group-title="G${i%20}",Channel ${i}`);
    rows.push(`http://h.com/live/${i}.m3u8`);
  }
  return rows.join('\n');
}

describe('Parser benchmark', () => {
  test('parses 100k lines in under 3s', () => {
    const big = generateLargeM3U(50000); // ~100k lines (EXTINF+URL per track)
    const start = Date.now();
    const res = parseM3U(big);
    const elapsed = Date.now() - start;
    expect(res.tracks.length).toBe(50000);
    expect(elapsed).toBeLessThan(3000);
  });
});


