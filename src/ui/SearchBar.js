(function(global){
  const { Metrics } = (global.UI = global.UI || {});

  function buildIndex(items){
    return items.map((item, idx) => ({
      idx,
      title: (item.title||'').toLowerCase(),
      group: (item.group||'').toLowerCase(),
      type: (item.type||'').toLowerCase(),
      composite: `${(item.title||'').toLowerCase()} ${(item.group||'').toLowerCase()} ${(item.type||'').toLowerCase()}`
    }));
  }

  function searchIndex(index, query, filters){
    const q = (query||'').toLowerCase().trim();
    const g = (filters && filters.group || '').toLowerCase();
    const t = (filters && filters.type || '').toLowerCase();

    if(!q && !g && !t){ return index.map(e => e.idx); }

    const results = [];
    for(let i=0;i<index.length;i++){
      const e = index[i];
      if(q && e.composite.indexOf(q) === -1) continue;
      if(g && e.group.indexOf(g) === -1) continue;
      if(t && e.type.indexOf(t) === -1) continue;
      results.push(e.idx);
    }
    return results;
  }

  const SearchBar = function(options){
    const items = options.items || [];
    const onResults = options.onResults || (()=>{});

    Metrics && Metrics.mark('SearchBar:index');
    let index = buildIndex(items);
    Metrics && Metrics.measure('search.indexMs', 'SearchBar:index');

    function updateItems(newItems){
      Metrics && Metrics.mark('SearchBar:index.update');
      index = buildIndex(newItems);
      Metrics && Metrics.measure('search.indexUpdateMs', 'SearchBar:index.update');
    }

    function run(query, filters){
      Metrics && Metrics.mark('SearchBar:search');
      const indices = searchIndex(index, query, filters);
      const ms = Metrics ? Metrics.measure('search.ms', 'SearchBar:search') : 0;
      if(global.__DEV__){
        console.log(`🔎 search '${query}' → ${indices.length} results in ${Math.round(ms)} ms`);
      }
      onResults(indices);
      return indices;
    }

    return { updateItems, run };
  };

  global.UI = global.UI || {};
  global.UI.SearchBar = SearchBar;
})(window);
