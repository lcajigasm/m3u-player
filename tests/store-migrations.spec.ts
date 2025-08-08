import { migrateLibraryState, createInitialState, CURRENT_LIBRARY_VERSION } from '../src/store/schema';

describe('Library store migrations', () => {
  test('creates initial state when input is null', () => {
    const state = migrateLibraryState(null);
    expect(state.version).toBe(CURRENT_LIBRARY_VERSION);
    expect(state.playlists).toEqual([]);
    expect(state.favorites.folders).toEqual([]);
    expect(state.favorites.items).toEqual([]);
    expect(state.recents).toEqual([]);
  });

  test('migrates from version 0 flat structure', () => {
    const legacy = {
      playlists: [
        { name: 'A', source: { type: 'file', path: '/tmp/a.m3u' }, enabled: true, content: '#EXTM3U\n' },
        { filename: 'b.m3u', source: { type: 'url', url: 'https://x/b.m3u' }, enabled: false },
      ],
      favorites: [
        { selector: { tvgId: 'chan1' }, label: 'Fav1' },
        { selector: { url: 'https://u' } },
      ],
      recents: [
        { selector: { name: 'X' }, playedAt: 1 },
        { selector: { name: 'Y' }, playedAt: 2 },
        { selector: { name: 'Z' }, playedAt: 3 },
      ],
    } as any;

    const state = migrateLibraryState(legacy);
    expect(state.version).toBe(CURRENT_LIBRARY_VERSION);
    expect(state.playlists.length).toBe(2);
    expect(state.playlists[0].name).toBe('A');
    expect(state.playlists[1].name).toBe('b.m3u');
    expect(state.favorites.items.length).toBe(2);
    expect(state.recents.length).toBe(3);
    // recents sorted desc by playedAt
    expect(state.recents[0].playedAt).toBeGreaterThanOrEqual(state.recents[1].playedAt);
  });

  test('caps recents at 20 items', () => {
    const many = Array.from({ length: 50 }, (_, i) => ({ selector: { name: `c${i}` }, playedAt: i }));
    const state = migrateLibraryState({ recents: many } as any);
    expect(state.recents.length).toBe(20);
    // Top element should be the highest playedAt
    const top = Math.max(...many.map((x) => x.playedAt));
    expect(state.recents[0].playedAt).toBe(top);
  });

  test('preserves content for export', () => {
    const state = migrateLibraryState({
      playlists: [{ name: 'A', source: { type: 'url', url: 'https://x' }, content: '#EXTM3U\n#EXTINF:-1,Test\nhttp://u' }],
    } as any);
    expect(state.playlists[0].content).toContain('#EXTM3U');
  });
});


