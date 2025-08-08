class LibrarySidebar {
  constructor(rootId = 'librarySidebar') {
    this.root = document.getElementById(rootId);
    this.state = null;
    if (!this.root) return;
    this.init();
  }

  async init() {
    await this.load();
    this.render();
  }

  async load() {
    try {
      this.state = (await window.api?.library?.get()) || { playlists: [], favorites: { folders: [], items: [] }, recents: [] };
    } catch {
      this.state = { playlists: [], favorites: { folders: [], items: [] }, recents: [] };
    }
  }

  async save() {
    if (!this.state) return;
    await window.api?.library?.set(this.state);
  }

  render() {
    const s = this.state || { playlists: [], favorites: { folders: [], items: [] }, recents: [] };
    this.root.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'lib-header';
    header.innerHTML = `
      <div class="lib-title">📚 Library</div>
      <div class="lib-actions">
        <button id="libExportJson" title="Export Library JSON">📤 JSON</button>
        <button id="libExportM3U" title="Export merged M3U">💾 M3U</button>
      </div>
    `;
    this.root.appendChild(header);

    const stats = document.createElement('div');
    stats.className = 'lib-stats';
    stats.innerHTML = `
      <span class="badge">Playlists: ${s.playlists.length}</span>
      <span class="badge">Favorites: ${s.favorites.items.length}</span>
      <span class="badge">Recents: ${s.recents.length}</span>
    `;
    this.root.appendChild(stats);

    const list = document.createElement('div');
    list.className = 'lib-list';
    this.root.appendChild(list);

    const sorted = (s.playlists || []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    for (let i = 0; i < sorted.length; i += 1) {
      const p = sorted[i];
      const row = document.createElement('div');
      row.className = 'lib-row';
      row.innerHTML = `
        <input type="checkbox" class="lib-enabled" ${p.enabled !== false ? 'checked' : ''} />
        <span class="lib-name" title="${p.name}">${this.escape(p.name)}</span>
        <span class="lib-badge lib-origin-${(p.source?.type || 'unknown').replace(/[^a-z0-9]/gi,'-').toLowerCase()}">${p.source?.type || 'unknown'}</span>
        <div class="lib-row-actions">
          <button class="lib-up" title="Move up">↑</button>
          <button class="lib-down" title="Move down">↓</button>
        </div>
      `;
      list.appendChild(row);

      const checkbox = row.querySelector('.lib-enabled');
      checkbox.addEventListener('change', async () => {
        p.enabled = checkbox.checked;
        await this.save();
      });

      const upBtn = row.querySelector('.lib-up');
      const downBtn = row.querySelector('.lib-down');
      upBtn.addEventListener('click', async () => {
        this.movePlaylist(p.id, -1);
        await this.save();
        await this.load();
        this.render();
      });
      downBtn.addEventListener('click', async () => {
        this.movePlaylist(p.id, +1);
        await this.save();
        await this.load();
        this.render();
      });
    }

    this.bindExports();
    this.applyStyles();
  }

  bindExports() {
    const jsonBtn = this.root.querySelector('#libExportJson');
    const m3uBtn = this.root.querySelector('#libExportM3U');
    if (jsonBtn) {
      jsonBtn.addEventListener('click', async () => {
        const { success, state, error } = await window.api.library.exportJSON();
        if (!success) return console.error('Export JSON failed:', error);
        const { filePath, canceled } = await window.api.dialog.showSave({ title: 'Save Library JSON', filters: [{ name: 'JSON', extensions: ['json'] }] });
        if (canceled || !filePath) return;
        await window.api.fs.writeFile(filePath, JSON.stringify(state, null, 2));
      });
    }
    if (m3uBtn) {
      m3uBtn.addEventListener('click', async () => {
        const { success, m3u, error } = await window.api.library.exportM3U();
        if (!success) return console.error('Export M3U failed:', error);
        const { filePath, canceled } = await window.api.dialog.showSave({ title: 'Save M3U', filters: [{ name: 'M3U', extensions: ['m3u', 'm3u8'] }] });
        if (canceled || !filePath) return;
        await window.api.fs.writeFile(filePath, m3u);
      });
    }
  }

  movePlaylist(id, delta) {
    const arr = this.state.playlists || [];
    const sorted = arr.slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    const index = sorted.findIndex((p) => p.id === id);
    if (index < 0) return;
    const newIndex = Math.max(0, Math.min(sorted.length - 1, index + delta));
    if (newIndex === index) return;
    const [moved] = sorted.splice(index, 1);
    sorted.splice(newIndex, 0, moved);
    // reassign order
    this.state.playlists = sorted.map((p, i) => ({ ...p, order: i }));
  }

  escape(s) {
    return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  applyStyles() {
    if (this._styled) return;
    this._styled = true;
    const css = document.createElement('style');
    css.textContent = `
      #librarySidebar { padding: 8px; border-right: 1px solid var(--bg-secondary); }
      #librarySidebar .lib-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; }
      #librarySidebar .lib-title { font-weight: 700; }
      #librarySidebar .lib-actions button { margin-left: 6px; }
      #librarySidebar .lib-stats { display:flex; gap:6px; margin-bottom:8px; }
      #librarySidebar .badge { background: var(--bg-secondary); padding: 2px 6px; border-radius: 10px; font-size: 12px; }
      #librarySidebar .lib-list { display:flex; flex-direction:column; gap:6px; }
      #librarySidebar .lib-row { display:grid; grid-template-columns: 20px 1fr auto auto; align-items:center; gap:8px; padding:6px; border-radius:6px; background: var(--bg-secondary); }
      #librarySidebar .lib-name { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
      #librarySidebar .lib-badge { font-size: 11px; padding: 2px 6px; border-radius: 10px; background: #2b2f3a; color: #cbd5e1; justify-self:start; }
      #librarySidebar .lib-row-actions button { margin-left: 4px; }
    `;
    document.head.appendChild(css);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // Inject sidebar if container exists
  const container = document.getElementById('librarySidebar');
  if (container) new LibrarySidebar('librarySidebar');
});

export default LibrarySidebar;


