import { mapChannels } from '../src/epg/map';

describe('EPG map', () => {
  const xmltv = new Map<string, { id: string; name: string; country?: string | null }>([
    ['la1.es', { id: 'la1.es', name: 'La 1', country: 'ES' }],
    ['la2.es', { id: 'la2.es', name: 'La 2', country: 'ES' }],
    ['bbc-one.uk', { id: 'bbc-one.uk', name: 'BBC One', country: 'UK' }],
  ]);

  it('maps by exact tvg-id', () => {
    const playlist = [
      { id: 'x', name: 'La 1 HD', attrs: { 'tvg-id': 'la1.es', 'tvg-country': 'ES' } },
    ];
    const res = mapChannels(playlist as any, xmltv);
    expect(res.map.get('la1.es')).toBe('la1.es');
    expect(res.coverage).toBe(100);
  });

  it('maps by similarity when id missing', () => {
    const playlist = [
      { name: 'La1', attrs: { 'tvg-country': 'ES' } },
      { name: 'BBC1', attrs: { 'tvg-country': 'UK' } },
    ];
    const res = mapChannels(playlist as any, xmltv, { minSimilarity: 0.5 });
    expect(res.map.size).toBeGreaterThanOrEqual(1);
    expect(res.coverage).toBeGreaterThan(0);
  });

  it('boosts same country', () => {
    const playlist = [
      { name: 'La 2', attrs: { 'tvg-country': 'ES' } },
    ];
    const res = mapChannels(playlist as any, xmltv, { minSimilarity: 0.6 });
    expect(Array.from(res.map.values())).toContain('la2.es');
  });
});


