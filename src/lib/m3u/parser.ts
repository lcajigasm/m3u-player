/*
 * M3U / M3U8 / M3U Plus Parser and Exporter
 *
 * Focus: performance on large files (>100k lines), attribute preservation, tolerant parsing
 */

export type M3UHeaderAttributes = Record<string, string>;

export interface M3UTrack {
  name: string;
  duration: number | null;
  attrs: Record<string, string>;
  attrOrder?: string[];
  url: string;
  extras?: string[]; // Any unknown tag lines between EXTINF and URL
}

export interface M3UPlaylist {
  header: M3UHeaderAttributes;
  tracks: M3UTrack[];
}

export interface ParseOptions {
  tolerant?: boolean;
}

const ATTRIBUTE_REGEX = /([A-Za-z0-9_\-\.]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s]+))/g;

function parseAttributePairs(input: string, attrOrder?: string[]): Record<string, string> {
  const attributes: Record<string, string> = {};
  let match: RegExpExecArray | null;
  ATTRIBUTE_REGEX.lastIndex = 0;
  while ((match = ATTRIBUTE_REGEX.exec(input)) !== null) {
    const key = match[1].toLowerCase();
    const value = match[3] ?? match[4] ?? match[5] ?? '';
    attributes[key] = value;
    if (attrOrder) attrOrder.push(key);
  }
  return attributes;
}

function parseHeader(line: string): M3UHeaderAttributes {
  // Example: #EXTM3U x-tvg-url="..." url-tvg='...'
  const after = line.replace(/^#EXTM3U\s*/i, '');
  return parseAttributePairs(after);
}

function parseExtinf(line: string): { duration: number | null; attrs: Record<string, string>; attrOrder: string[]; name: string } {
  // Format: #EXTINF:<duration> <attrs>,<name>
  const after = line.substring(line.indexOf(':') + 1);

  // Find first comma that is not inside quotes
  let inSingle = false;
  let inDouble = false;
  let commaIndex = -1;
  for (let i = 0; i < after.length; i++) {
    const ch = after[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === ',' && !inSingle && !inDouble) {
      commaIndex = i;
      break;
    }
  }

  const left = commaIndex >= 0 ? after.substring(0, commaIndex) : after;
  const name = commaIndex >= 0 ? after.substring(commaIndex + 1).trim() : '';

  // Extract leading numeric duration if present
  let duration: number | null = null;
  let attrsRaw = left;
  const leftTrimmed = left.trim();
  const durMatch = leftTrimmed.match(/^-?\d+/);
  if (durMatch) {
    const maybeDuration = Number(durMatch[0]);
    if (!Number.isNaN(maybeDuration)) {
      duration = maybeDuration;
      attrsRaw = leftTrimmed.substring(durMatch[0].length);
    }
  }

  const attrOrder: string[] = [];
  const attrs = parseAttributePairs(attrsRaw, attrOrder);
  // Normalize some common aliases
  if (attrs['group']) attrs['group-title'] = attrs['group'];
  return { duration, attrs, attrOrder, name: name.trim() };
}

export function parseM3U(text: string, options: ParseOptions = {}): M3UPlaylist {
  const tolerant = options.tolerant !== false; // default true
  const lines = text.split(/\r?\n/);
  const tracks: M3UTrack[] = [];
  let header: M3UHeaderAttributes = {};

  let pending: { name: string; duration: number | null; attrs: Record<string, string>; attrOrder: string[]; extras: string[] } | null = null;

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i];
    if (!rawLine) continue;
    const line = rawLine.trim();
    if (i === 0 && /^#EXTM3U/i.test(line)) {
      header = parseHeader(line);
      continue;
    }

    if (line.startsWith('#')) {
      if (line.toUpperCase().startsWith('#EXTINF:')) {
        try {
          const { name, attrs, duration, attrOrder } = parseExtinf(line);
          pending = { name, attrs, duration, attrOrder, extras: [] };
        } catch (err) {
          if (!tolerant) throw err;
          pending = { name: '', attrs: {}, duration: null, attrOrder: [], extras: [] };
        }
        continue;
      }
      if (pending) {
        // Capture useful extra tags between EXTINF and URL for export
        if (
          line.startsWith('#EXTGRP:') ||
          line.startsWith('#EXTVLCOPT:') ||
          line.startsWith('#KODIPROP:') ||
          line.startsWith('#EXT-')
        ) {
          // Map #EXTGRP to group-title if not present
          if (line.startsWith('#EXTGRP:')) {
            const grp = line.substring('#EXTGRP:'.length).trim();
            if (grp && !pending.attrs['group-title']) pending.attrs['group-title'] = grp;
          }
          pending.extras.push(line);
        }
      }
      continue; // ignore other comments
    }

    // Non-comment line; likely a URL
    if (pending) {
      tracks.push({
        name: pending.name,
        duration: pending.duration,
        attrs: pending.attrs,
        attrOrder: pending.attrOrder,
        url: line,
        extras: pending.extras.length ? pending.extras : undefined,
      });
      pending = null;
      continue;
    }

    // If we get a bare URL without preceding EXTINF, create a minimal track when tolerant
    if (tolerant && !line.startsWith('#')) {
      tracks.push({ name: line, duration: null, attrs: {}, url: line });
    }
  }

  return { header, tracks };
}

export interface ExportOptions {
  headerAttributes?: M3UHeaderAttributes;
}

const PREFERRED_ATTR_ORDER = [
  'tvg-id',
  'tvg-name',
  'tvg-logo',
  'group-title',
  'catchup',
  'catchup-source',
  'catchup-days',
  'tvg-shift',
  'audio-track',
  'aspect-ratio',
];

function stringifyAttributes(attrs: Record<string, string>, attrOrder?: string[]): string {
  if (!attrs || Object.keys(attrs).length === 0) return '';
  const keysSeen = new Set<string>();
  const parts: string[] = [];

  // First: preferred order
  for (const key of PREFERRED_ATTR_ORDER) {
    if (key in attrs && !keysSeen.has(key)) {
      parts.push(`${key}="${attrs[key]}"`);
      keysSeen.add(key);
    }
  }

  // Then: original order for remaining keys if present
  if (attrOrder && attrOrder.length) {
    for (const key of attrOrder) {
      if (key in attrs && !keysSeen.has(key)) {
        parts.push(`${key}="${attrs[key]}"`);
        keysSeen.add(key);
      }
    }
  }

  // Finally: remaining keys alphabetical
  const remaining = Object.keys(attrs).filter((k) => !keysSeen.has(k)).sort();
  for (const key of remaining) {
    parts.push(`${key}="${attrs[key]}"`);
  }

  return parts.length ? ' ' + parts.join(' ') : '';
}

export function exportM3U(playlist: M3UPlaylist, options: ExportOptions = {}): string {
  const headerAttributes = options.headerAttributes ?? playlist.header ?? {};
  const headerAttrsStr = stringifyAttributes(headerAttributes);
  const lines: string[] = [`#EXTM3U${headerAttrsStr}`];
  for (const track of playlist.tracks) {
    const attrsStr = stringifyAttributes(track.attrs, track.attrOrder);
    const duration = typeof track.duration === 'number' ? track.duration : -1;
    lines.push(`#EXTINF:${duration}${attrsStr},${track.name}`);
    if (track.extras) {
      for (const x of track.extras) lines.push(x);
    }
    lines.push(track.url);
  }
  return lines.join('\n');
}

// Utilities exposed for normalization
export function slugifyChannelName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .trim();
}

export function getUrlBase(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname
      .split('/')
      .filter(Boolean)
      .slice(0, 2)
      .join('/');
    return `${u.protocol}//${u.hostname}/${path}`.replace(/\/$/, '');
  } catch {
    // Fallback: strip query and fragment
    const simple = url.split(/[?#]/)[0];
    const m = simple.match(/^(https?:\/\/)?([^\/]+)(?:\/(.*))?$/i);
    if (!m) return simple;
    const host = m[2] ?? '';
    const path = (m[3] ?? '').split('/').filter(Boolean).slice(0, 2).join('/');
    return (host + (path ? `/${path}` : '')).replace(/\/$/, '');
  }
}

export default parseM3U;


