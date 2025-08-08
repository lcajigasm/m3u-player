/*
 * EPG Store
 * - In-memory + localStorage cache with TTL
 */

import type { EPGProgram } from './loader';

export type CacheEntry = {
  programs: EPGProgram[];
  expiresAt: number; // epoch ms
};

export class EPGStore {
  private memory = new Map<string, CacheEntry>();
  private ttlMs: number;
  private prefix = 'epg:xmltv:';

  constructor(ttlMinutes = 120) {
    this.ttlMs = ttlMinutes * 60 * 1000;
  }

  get(channelId: string, now: number = Date.now()): EPGProgram[] | null {
    const m = this.memory.get(channelId);
    if (m && m.expiresAt > now) return m.programs;
    // try localStorage
    try {
      const raw = localStorage.getItem(this.prefix + channelId);
      if (!raw) return null;
      const entry = JSON.parse(raw) as CacheEntry & { programs: (Omit<EPGProgram, 'startTime' | 'endTime'> & { startTime: string; endTime: string })[] };
      if (entry.expiresAt <= now) return null;
      const programs: EPGProgram[] = entry.programs.map((p) => ({
        ...p,
        startTime: new Date(p.startTime),
        endTime: new Date(p.endTime),
      }));
      this.memory.set(channelId, { programs, expiresAt: entry.expiresAt });
      return programs;
    } catch {
      return null;
    }
  }

  set(channelId: string, programs: EPGProgram[], now: number = Date.now()): void {
    const entry: CacheEntry = { programs, expiresAt: now + this.ttlMs };
    this.memory.set(channelId, entry);
    try {
      const serializable = {
        ...entry,
        programs: programs.map((p) => ({
          ...p,
          startTime: p.startTime.toISOString(),
          endTime: p.endTime.toISOString(),
        })),
      };
      localStorage.setItem(this.prefix + channelId, JSON.stringify(serializable));
    } catch {
      // ignore storage errors
    }
  }
}


