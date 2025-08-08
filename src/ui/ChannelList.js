(function(global){
  const { Metrics, LogoCache } = (global.UI = global.UI || {});

  function defaultRender(item, index){
    const typeIcon = item.type === 'HLS' ? '📡' : item.type === 'Direct' ? '🎥' : '📺';
    const el = document.createElement('div');
    el.className = 'playlist-item';
    el.dataset.index = index;
    el.innerHTML = `
      <div class="playlist-item-number">${index + 1}</div>
      <div class="playlist-item-logo"><div class="logo-placeholder">${typeIcon}</div></div>
      <div class="playlist-item-content">
        <div class="playlist-item-title" title="${escapeHtml(item.title)}">${escapeHtml(item.title)}</div>
        <div class="playlist-item-meta">
          <span class="stream-type">${typeIcon} ${item.type}</span>
          ${item.group ? `<span class="group-tag">📂 ${escapeHtml(item.group)}</span>` : ''}
        </div>
      </div>
      <div class="playlist-item-actions"><button class="test-stream-btn" title="Probar stream">🔧</button></div>
    `;
    if(item.logo){
      // async replace placeholder with cached logo
      LogoCache.get(item.logo).then(objUrl => {
        const logoWrap = el.querySelector('.playlist-item-logo');
        if(logoWrap){
          if(objUrl){
            logoWrap.innerHTML = `<img src="${objUrl}" alt="Logo" />`;
          }
        }
      }).catch(()=>{});
    }
    return el;
  }

  function escapeHtml(text){
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }

  const ChannelList = function(options){
    const container = options.container; // HTMLElement
    const items = options.items || [];
    const onItemClick = options.onItemClick || (()=>{});
    const onTestClick = options.onTestClick || (()=>{});
    const renderItem = options.renderItem || defaultRender;
    const VirtualScroller = global.VirtualScroller || (global.M3U && global.M3U.VirtualScroller);

    if(!container){ throw new Error('ChannelList requires container'); }

    // Ensure container fills available height for smoother scroll
    container.style.position = container.style.position || 'relative';

    // init scroller
    const scroller = new (global.M3U_VirtualScroller || global.VirtualScroller || function(){
      // fallback: minimal render without virtualization
      this.setData = (data, render) => {
        const frag = document.createDocumentFragment();
        data.forEach((d, i)=>{ frag.appendChild(render(d, i)); });
        container.innerHTML=''; container.appendChild(frag);
      };
      this.updateData = (data) => {};
    })(container, {
      itemHeight: 60,
      bufferSize: 12,
      threshold: 100, // always virtualize for large lists via our logic
      overscan: 6,
      enableSmoothScrolling: true
    });

    function wireEvents(el, item, index){
      el.addEventListener('click', (e)=>{
        if(!(e.target && e.target.classList && e.target.classList.contains('test-stream-btn'))){
          onItemClick(item, index);
        }
      });
      const btn = el.querySelector('.test-stream-btn');
      btn && btn.addEventListener('click', (e)=>{ e.stopPropagation(); onTestClick(item, index); });
    }

    const wrappedRender = (item, idx) => {
      const el = renderItem(item, idx);
      wireEvents(el, item, idx);
      return el;
    };

    Metrics && Metrics.mark('ChannelList:setData');
    scroller.setData(items, wrappedRender);
    Metrics && Metrics.measure('channelList.initialRenderMs', 'ChannelList:setData');

    return {
      update(newItems){
        Metrics && Metrics.mark('ChannelList:update');
        scroller.updateData(newItems);
        Metrics && Metrics.measure('channelList.updateMs', 'ChannelList:update');
      }
    };
  };

  global.UI = global.UI || {};
  global.UI.ChannelList = ChannelList;
})(window);
