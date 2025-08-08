(function(global){
  const DB_NAME = 'm3u-logo-cache';
  const STORE = 'logos';
  const DB_VERSION = 1;

  function openDb(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if(!db.objectStoreNames.contains(STORE)){
          const os = db.createObjectStore(STORE, { keyPath: 'url' });
          os.createIndex('expiresAt', 'expiresAt');
        }
      };
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async function getFromCache(db, url){
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const getReq = store.get(url);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  }

  async function putToCache(db, entry){
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const putReq = store.put(entry);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    });
  }

  async function cleanup(db){
    return new Promise((resolve) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const index = store.index('expiresAt');
      const now = Date.now();
      const range = IDBKeyRange.upperBound(now);
      const req = index.openCursor(range);
      req.onsuccess = () => {
        const cursor = req.result;
        if(cursor){
          store.delete(cursor.primaryKey);
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => resolve();
    });
  }

  async function fetchLogo(url, ttlMs){
    const resp = await fetch(url, { cache: 'no-store' });
    if(!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return { blob, expiresAt: Date.now() + ttlMs };
  }

  const LogoCache = {
    ttlMs: 24*60*60*1000,
    async get(url){
      if(!url) return null;
      try{
        const db = await openDb();
        await cleanup(db);
        const cached = await getFromCache(db, url);
        if(cached && cached.expiresAt > Date.now()){
          return URL.createObjectURL(cached.blob);
        }
        const { blob, expiresAt } = await fetchLogo(url, this.ttlMs);
        await putToCache(db, { url, blob, expiresAt });
        return URL.createObjectURL(blob);
      }catch(e){
        // Fallback to direct URL
        return url;
      }
    }
  };

  global.UI = global.UI || {};
  global.UI.LogoCache = LogoCache;
})(window);
