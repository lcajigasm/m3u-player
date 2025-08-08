/*
 * Diagnostics & Telemetry (opt-in)
 * - Captures recent HTTP requests via window.fetch wrapper
 * - Surfaces effective headers (masked), HTTP status, latency, and URL
 * - Shows HLS.js version and effective User-Agent
 * - Provides anonymous, opt-in telemetry with configurable endpoint
 */

(function initDiagnostics(global){
  const SENSITIVE_HEADERS = ['authorization', 'proxy-authorization', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'];

  function maskHeaderValue(name, value){
    if(!value) return value;
    if(SENSITIVE_HEADERS.includes(String(name||'').toLowerCase())){
      if(typeof value === 'string' && value.length > 6){
        return `${value.slice(0,3)}…${value.slice(-2)}`;
      }
      return '•••';
    }
    return value;
  }

  function toPlainHeaders(headers){
    const result = {};
    if(!headers) return result;
    try{
      if(headers.forEach){
        headers.forEach((v, k)=>{ result[k] = maskHeaderValue(k, v); });
      } else if (Array.isArray(headers)){
        headers.forEach(([k,v])=>{ result[k] = maskHeaderValue(k, v); });
      } else if (typeof headers === 'object'){
        for(const k of Object.keys(headers)){
          result[k] = maskHeaderValue(k, headers[k]);
        }
      }
    }catch{}
    return result;
  }

  const Diagnostics = {
    recentRequests: [], // { ts, method, url, status, ms, reqHeaders, resHeaders }
    maxItems: 100,
    telemetry: {
      enabled: false,
      endpoint: '',
      timer: null,
      intervalMs: 15 * 60 * 1000, // 15m
    },

    init(playerRef){
      this.playerRef = playerRef || null;
      this.telemetry.enabled = this._loadBool('telemetry.enabled', false);
      this.telemetry.endpoint = this._loadStr('telemetry.endpoint', 'http://localhost:0/telemetry');
      this._patchFetch();
      this._wireUI();
      this._maybeStartTelemetry();
    },

    addRequest(entry){
      this.recentRequests.push(entry);
      if(this.recentRequests.length > this.maxItems){
        this.recentRequests.shift();
      }
      this._renderList();
    },

    _patchFetch(){
      if(this._fetchPatched) return;
      const originalFetch = global.fetch && global.fetch.bind(global);
      if(!originalFetch) return;
      const self = this;
      global.fetch = async function patchedFetch(input, init){
        const startedAt = performance.now();
        let url = '';
        let method = 'GET';
        let reqHeaders = {};
        try{
          if(typeof input === 'string' || input instanceof URL){ url = String(input); }
          else if (input && input.url){ url = String(input.url); }
          if(init && init.method){ method = init.method; }
          else if(input && input.method){ method = input.method; }
          // Merge headers from init or input
          const h = (init && init.headers) || (input && input.headers) || {};
          reqHeaders = toPlainHeaders(h);
        }catch{}
        try{
          const resp = await originalFetch(input, init);
          const ms = Math.round(performance.now() - startedAt);
          const resHeaders = {};
          try{ resp.headers && resp.headers.forEach && resp.headers.forEach((v,k)=>{ resHeaders[k]=maskHeaderValue(k,v); }); }catch{}
          self.addRequest({ ts: Date.now(), method, url, status: resp.status, ms, reqHeaders, resHeaders });
          return resp;
        }catch(err){
          const ms = Math.round(performance.now() - startedAt);
          self.addRequest({ ts: Date.now(), method, url, status: -1, ms, reqHeaders, resHeaders: {} });
          throw err;
        }
      };
      this._fetchPatched = true;
    },

    _wireUI(){
      // Header button
      const openBtn = document.getElementById('diagnosticsHeaderBtn');
      const modal = document.getElementById('diagnosticsModal');
      const closeBtn = document.getElementById('closeDiagnostics');
      openBtn && openBtn.addEventListener('click', ()=>{ modal && (modal.style.display = 'block'); this._renderPanelInfo(); this._renderList(); });
      closeBtn && closeBtn.addEventListener('click', ()=>{ modal && (modal.style.display = 'none'); });

      // Telemetry controls
      const optIn = document.getElementById('telemetryOptIn');
      const endpoint = document.getElementById('telemetryEndpoint');
      const sendBtn = document.getElementById('sendTelemetryNow');
      if(optIn){ optIn.checked = !!this.telemetry.enabled; optIn.addEventListener('change', ()=>{ this.telemetry.enabled = !!optIn.checked; this._saveBool('telemetry.enabled', this.telemetry.enabled); this._maybeStartTelemetry(true); }); }
      if(endpoint){ endpoint.value = this.telemetry.endpoint || ''; endpoint.addEventListener('input', ()=>{ this.telemetry.endpoint = endpoint.value.trim(); this._saveStr('telemetry.endpoint', this.telemetry.endpoint); }); }
      sendBtn && sendBtn.addEventListener('click', ()=>{ this.sendTelemetry().catch(()=>{}); });
    },

    _renderPanelInfo(){
      const hlsVersionEl = document.getElementById('hlsVersion');
      const uaEl = document.getElementById('effectiveUA');
      const appVerEl = document.getElementById('diagAppVersion');
      const playlistSizeEl = document.getElementById('diagPlaylistSize');
      hlsVersionEl && (hlsVersionEl.textContent = (global.Hls && global.Hls.version) ? global.Hls.version : 'N/A');
      // Effective UA: prefer player setting if exposed, fallback to navigator.userAgent
      let ua = '';
      try{ ua = (this.playerRef && this.playerRef.config && this.playerRef.config.playerSettings && this.playerRef.config.playerSettings.userAgent) || navigator.userAgent; }catch{ ua = navigator.userAgent; }
      uaEl && (uaEl.textContent = ua);
      const appVerDom = document.getElementById('appVersion');
      const appVersion = (appVerDom && appVerDom.textContent) || '2.0.0';
      appVerEl && (appVerEl.textContent = appVersion);
      const psize = (this.playerRef && Array.isArray(this.playerRef.playlistData)) ? this.playerRef.playlistData.length : 0;
      playlistSizeEl && (playlistSizeEl.textContent = String(psize));
    },

    _renderList(){
      const tbody = document.getElementById('diagnosticsTableBody');
      if(!tbody) return;
      const rows = this.recentRequests.slice(-50).reverse().map(r => {
        const date = new Date(r.ts).toLocaleTimeString();
        const urlShort = (r.url || '').slice(0, 80);
        return `<tr>
          <td>${date}</td>
          <td>${r.method || ''}</td>
          <td>${r.status}</td>
          <td>${r.ms} ms</td>
          <td title="${this._escape(r.url)}">${this._escape(urlShort)}${r.url && r.url.length>80?'…':''}</td>
        </tr>`;
      }).join('');
      tbody.innerHTML = rows || '<tr><td colspan="5">No requests yet</td></tr>';

      // Last request headers preview
      const last = this.recentRequests[this.recentRequests.length-1];
      const headersPre = document.getElementById('appliedHeaders');
      if(headersPre){ headersPre.textContent = last ? JSON.stringify(last.reqHeaders || {}, null, 2) : '{}'; }
    },

    sendTelemetry: async function(){
      if(!this.telemetry.enabled) return;
      const url = (this.telemetry.endpoint||'').trim();
      if(!url || !/^https?:\/\//i.test(url)) return;
      const body = this._collectTelemetry();
      try{
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), mode: 'no-cors' });
      }catch{}
    },

    _collectTelemetry(){
      const appVerDom = document.getElementById('appVersion');
      const appVersion = (appVerDom && appVerDom.textContent) || '2.0.0';
      const os = navigator.userAgent || '';
      const playlistSize = (this.playerRef && Array.isArray(this.playerRef.playlistData)) ? this.playerRef.playlistData.length : 0;
      const perf = {
        navStartMs: (performance.timing && performance.timing.navigationStart) ? performance.now() : 0,
        memory: (performance && performance.memory) ? { jsHeapSizeLimit: performance.memory.jsHeapSizeLimit, totalJSHeapSize: performance.memory.totalJSHeapSize, usedJSHeapSize: performance.memory.usedJSHeapSize } : undefined,
      };
      return {
        appVersion,
        os,
        playlistSize,
        requestsObserved: this.recentRequests.length,
        hlsVersion: (global.Hls && global.Hls.version) || 'N/A',
        perf,
        ts: new Date().toISOString(),
      };
    },

    _maybeStartTelemetry(reset){
      if(this.telemetry.timer){ clearInterval(this.telemetry.timer); this.telemetry.timer = null; }
      if(this.telemetry.enabled){
        // Send one soon after enabling, then periodically
        this.sendTelemetry().catch(()=>{});
        this.telemetry.timer = setInterval(()=>{ this.sendTelemetry().catch(()=>{}); }, this.telemetry.intervalMs);
      }
    },

    _escape(s){ return String(s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); },

    _loadBool(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : v === '1'; }catch{ return d; } },
    _saveBool(k, v){ try{ localStorage.setItem(k, v ? '1' : '0'); }catch{} },
    _loadStr(k, d){ try{ const v = localStorage.getItem(k); return v == null ? d : String(v); }catch{ return d; } },
    _saveStr(k, v){ try{ localStorage.setItem(k, v == null ? '' : String(v)); }catch{} },
  };

  global.Diagnostics = Diagnostics;
})(window);


