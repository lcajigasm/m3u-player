/*
 * Library schema and migrations for playlists, favorites (with folders), and recents
 */

export type UUID = string;

export type PlaylistSourceType = 'file' | 'url' | 'embedded' | 'iptv-org' | 'free-tv' | 'unknown';

export interface PlaylistSource {
  type: PlaylistSourceType;
  path?: string; // for file
  url?: string; // for url
}

export interface StoredPlaylist {
  id: UUID;
  name: string;
  source: PlaylistSource;
  enabled: boolean;
  order: number;
  createdAt: number;
  updatedAt: number;
  // Keep a cached snapshot of content to enable export without re-fetch
  content?: string;
}

export interface ChannelSelector {
  // Try to ensure stability across restarts/content changes
  tvgId?: string;
  url?: string;
  name?: string;
}

export interface FavoriteFolder {
  id: UUID;
  name: string;
  parentId: UUID | null;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface FavoriteItem {
  id: UUID;
  selector: ChannelSelector;
  folderId: UUID | null;
  addedAt: number;
  label?: string;
}

export interface RecentItem {
  id: UUID;
  selector: ChannelSelector;
  playedAt: number;
}

export interface LibraryStateV1 {
  version: 1;
  playlists: StoredPlaylist[];
  favorites: {
    folders: FavoriteFolder[];
    items: FavoriteItem[];
  };
  recents: RecentItem[]; // capped to last 20
}

export type AnyLibraryState = Partial<Record<string, unknown>> & { version?: number };

export type LibraryState = LibraryStateV1;

export const CURRENT_LIBRARY_VERSION = 1 as const;

export function generateId(prefix: string = 'id'): UUID {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createInitialState(): LibraryState {
  return {
    version: CURRENT_LIBRARY_VERSION,
    playlists: [],
    favorites: { folders: [], items: [] },
    recents: [],
  };
}

// Migrations map: from -> migrator
type Migrator = (input: AnyLibraryState) => AnyLibraryState;

const MIGRATIONS: Record<number, Migrator> = {
  // 0/undefined -> 1
  0: (input: AnyLibraryState) => {
    const migrated: LibraryStateV1 = {
      version: 1,
      playlists: [],
      favorites: { folders: [], items: [] },
      recents: [],
    };

    // Best-effort migration from previous ad-hoc storages
    // If a plain array of playlists exists, normalize minimally
    const anyPlaylists = (input as any)?.playlists;
    if (Array.isArray(anyPlaylists)) {
      migrated.playlists = anyPlaylists.map((p: any, idx: number) => {
        return {
          id: p.id ?? generateId('pl'),
          name: p.name ?? p.filename ?? `Playlist ${idx + 1}`,
          source: normalizeSource(p.source),
          enabled: typeof p.enabled === 'boolean' ? p.enabled : true,
          order: typeof p.order === 'number' ? p.order : idx,
          createdAt: p.createdAt ?? Date.now(),
          updatedAt: Date.now(),
          content: p.content ?? undefined,
        } as StoredPlaylist;
      });
    }

    // Favorites (flat list)
    const anyFavorites = (input as any)?.favorites;
    if (Array.isArray(anyFavorites)) {
      migrated.favorites.items = anyFavorites.map((f: any) => ({
        id: f.id ?? generateId('fav'),
        selector: normalizeSelector(f.selector ?? f),
        folderId: null,
        addedAt: f.addedAt ?? Date.now(),
        label: f.label ?? undefined,
      }));
    }

    // Recents
    const anyRecents = (input as any)?.recents ?? (input as any)?.recentFiles;
    if (Array.isArray(anyRecents)) {
      migrated.recents = anyRecents
        .map((r: any) => ({
          id: r.id ?? generateId('rec'),
          selector: normalizeSelector(r.selector ?? r),
          playedAt: r.playedAt ?? r.timestamp ?? Date.now(),
        }))
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 20);
    }

    return migrated;
  },
};

export function migrateLibraryState(input: AnyLibraryState | undefined | null): LibraryState {
  if (!input || typeof input !== 'object') {
    return createInitialState();
  }

  let working: AnyLibraryState = { ...input };
  const fromVersion = typeof working.version === 'number' ? working.version : 0;

  for (let v = fromVersion; v < CURRENT_LIBRARY_VERSION; v += 1) {
    const migrator = MIGRATIONS[v as keyof typeof MIGRATIONS];
    if (migrator) {
      working = migrator(working);
    }
  }

  // Ensure shape
  const normalized = normalizeFinal(working);
  return normalized;
}

function normalizeFinal(input: AnyLibraryState): LibraryState {
  const state: LibraryStateV1 = {
    version: 1,
    playlists: [],
    favorites: { folders: [], items: [] },
    recents: [],
  };

  if (Array.isArray((input as any).playlists)) {
    state.playlists = (input as any).playlists.map((p: any, idx: number) => {
      const pl: StoredPlaylist = {
        id: String(p.id ?? generateId('pl')),
        name: String(p.name ?? `Playlist ${idx + 1}`),
        source: normalizeSource(p.source),
        enabled: Boolean(p.enabled ?? true),
        order: typeof p.order === 'number' ? p.order : idx,
        createdAt: Number(p.createdAt ?? Date.now()),
        updatedAt: Number(p.updatedAt ?? Date.now()),
        content: typeof p.content === 'string' ? p.content : undefined,
      };
      return pl;
    });
  }

  const favs = (input as any).favorites ?? {};
  state.favorites.folders = Array.isArray(favs.folders)
    ? favs.folders.map((f: any, idx: number) => ({
        id: String(f.id ?? generateId('ff')),
        name: String(f.name ?? `Folder ${idx + 1}`),
        parentId: f.parentId ? String(f.parentId) : null,
        order: typeof f.order === 'number' ? f.order : idx,
        createdAt: Number(f.createdAt ?? Date.now()),
        updatedAt: Number(f.updatedAt ?? Date.now()),
      }))
    : [];
  state.favorites.items = Array.isArray(favs.items)
    ? favs.items.map((it: any) => ({
        id: String(it.id ?? generateId('fav')),
        selector: normalizeSelector(it.selector ?? it),
        folderId: it.folderId ? String(it.folderId) : null,
        addedAt: Number(it.addedAt ?? Date.now()),
        label: typeof it.label === 'string' ? it.label : undefined,
      }))
    : [];

  const rec = (input as any).recents ?? [];
  state.recents = Array.isArray(rec)
    ? rec
        .map((r: any) => ({
          id: String(r.id ?? generateId('rec')),
          selector: normalizeSelector(r.selector ?? r),
          playedAt: Number(r.playedAt ?? Date.now()),
        }))
        .sort((a, b) => b.playedAt - a.playedAt)
        .slice(0, 20)
    : [];

  return state;
}

function normalizeSource(source: any): PlaylistSource {
  const type = (source?.type as PlaylistSourceType) ?? 'unknown';
  const s: PlaylistSource = { type };
  if (typeof source?.path === 'string') s.path = source.path;
  if (typeof source?.url === 'string') s.url = source.url;
  return s;
}

function normalizeSelector(raw: any): ChannelSelector {
  const selector: ChannelSelector = {};
  if (raw && typeof raw === 'object') {
    if (typeof raw.tvgId === 'string' && raw.tvgId) selector.tvgId = raw.tvgId;
    if (typeof raw.url === 'string' && raw.url) selector.url = raw.url;
    if (typeof raw.name === 'string' && raw.name) selector.name = raw.name;
  } else if (typeof raw === 'string') {
    // Heuristic: if looks like URL, store as url; else as name
    if (/^https?:\/\//i.test(raw)) selector.url = raw;
    else selector.name = raw;
  }
  return selector;
}

export function reorderPlaylists(playlists: StoredPlaylist[], newOrder: UUID[]): StoredPlaylist[] {
  const idToOrder = new Map<UUID, number>();
  newOrder.forEach((id, idx) => idToOrder.set(id, idx));
  return playlists
    .slice()
    .sort((a, b) => (idToOrder.get(a.id) ?? a.order) - (idToOrder.get(b.id) ?? b.order))
    .map((p, idx) => ({ ...p, order: idx }));
}

export function upsertRecent(recents: RecentItem[], selector: ChannelSelector, now: number = Date.now()): RecentItem[] {
  const cleaned = recents.filter((r) => !isSameSelector(r.selector, selector));
  cleaned.unshift({ id: generateId('rec'), selector, playedAt: now });
  return cleaned.slice(0, 20);
}

export function isSameSelector(a: ChannelSelector, b: ChannelSelector): boolean {
  if (a.tvgId && b.tvgId) return a.tvgId === b.tvgId;
  if (a.url && b.url) return a.url === b.url;
  if (a.name && b.name) return a.name.toLowerCase() === b.name.toLowerCase();
  return false;
}


