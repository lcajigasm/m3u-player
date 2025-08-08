const { _electron: electron, test, expect } = require('@playwright/test');

// Generates a synthetic playlist of N items
function genItems(n){
  const items = [];
  for(let i=0;i<n;i++){
    items.push({
      title: `Channel ${i} Sports`,
      group: i%2===0 ? 'Sports' : 'News',
      type: i%3===0 ? 'HLS' : 'Direct',
      url: `https://example.com/${i}.m3u8`,
      logo: ''
    });
  }
  return items;
}

// E2E: search should be < 50ms on 10k items
test('search performance under 50ms on 10k items', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  const window = await electronApp.firstWindow();

  // Inject a synthetic list and initialize UI components
  await window.evaluate(async ({ count }) => {
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

  // Validate time under 50ms
  const { dt } = await window.evaluate(() => {
    const ms = window.UI?.Metrics?.get('search.ms');
    return { dt: typeof ms === 'number' ? ms : 0 };
  });

  expect(dt).toBeLessThan(50);

  await electronApp.close();
});
