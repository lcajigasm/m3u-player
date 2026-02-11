const { _electron: electron, test, expect } = require('@playwright/test');

// E2E: search should be < 50ms on 10k items
test('search performance under 50ms on 10k items', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();

  // Inject a synthetic list and initialize UI components
  const result = await window.evaluate(async ({ count }) => {
    window.__DEV__ = true;
    const items = Array.from({length: count}, (_, i) => ({
      title: `Channel ${i} Sports`,
      group: i%2===0 ? 'Sports' : 'News',
      type: i%3===0 ? 'HLS' : 'Direct',
      url: `https://example.com/${i}.m3u8`,
      logo: ''
    }));

    // Ensure container exists
    const container = document.getElementById('playlist');
    container.style.height = '600px';

    // Build ChannelList
    const list = window.UI && window.UI.ChannelList ? window.UI.ChannelList({
      container,
      items,
      onItemClick: ()=>{},
      onTestClick: ()=>{}
    }) : null;

    // Build SearchBar
    const search = window.UI && window.UI.SearchBar ? window.UI.SearchBar({
      items,
      onResults: ()=>{}
    }) : null;

    // Run search and capture time
    const t0 = performance.now();
    const res = search ? search.run('sports', { group: 'Sports' }) : [];
    const t1 = performance.now();
    return { dt: t1 - t0, resultCount: res.length };
  }, { count: 10000 });

  // Validate time with an actual measured value
  expect(Number.isFinite(result.dt)).toBe(true);
  expect(result.dt).toBeGreaterThan(0);
  expect(result.resultCount).toBeGreaterThan(0);

  expect(result.dt).toBeLessThan(50);

  await electronApp.close();
});
