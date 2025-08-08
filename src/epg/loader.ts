/*
 * EPG Loader (XMLTV)
 * - Loads XMLTV from URL or Blob/File
 * - Supports gzip via DecompressionStream when available
 * - Parses channels and programmes with timezone/DST awareness
 */

export type EPGChannel = {
  id: string;
  name: string;
  logo?: string | null;
  country?: string | null;
};

export type EPGProgram = {
  id: string;
  channelId: string;
  title: string;
  description?: string | null;
  startTime: Date;
  endTime: Date;
  duration: number; // minutes
  genre?: string[] | null;
};

export type XMLTVData = {
  channels: Map<string, EPGChannel>;
  programs: Map<string, EPGProgram[]>; // channelId -> programs
};

function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const chr = input.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function parseXMLTVDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  // XMLTV format: 20231225140000 +0100 or 20231225140000
  const match = dateStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})\s*([+-]\d{4})?/);
  if (!match) return null;

  const [, year, month, day, hour, minute, second, timezone] = match;
  const date = new Date(
    Date.UTC(
      parseInt(year, 10),
      parseInt(month, 10) - 1,
      parseInt(day, 10),
      parseInt(hour, 10),
      parseInt(minute, 10),
      parseInt(second, 10)
    )
  );
  if (timezone) {
    const tz = timezone.match(/([+-])(\d{2})(\d{2})/);
    if (tz) {
      const sign = tz[1] === '+' ? -1 : 1;
      const tzH = parseInt(tz[2], 10);
      const tzM = parseInt(tz[3], 10);
      date.setMinutes(date.getMinutes() + sign * (tzH * 60 + tzM));
    }
  }
  return date;
}

export async function loadXMLTVFromURL(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch XMLTV: ${res.status}`);
  // Browsers/Electron auto-decompress Content-Encoding: gzip
  return await res.text();
}

export async function loadXMLTVFromBlob(blob: Blob): Promise<string> {
  const isGzip = /\.gz$/i.test((blob as any).name || '') || blob.type === 'application/gzip';
  if (isGzip && typeof (globalThis as any).DecompressionStream === 'function') {
    const ds = new (globalThis as any).DecompressionStream('gzip');
    const decompressed = (blob.stream() as any).pipeThrough(ds);
    const resp = new Response(decompressed);
    return await resp.text();
  }
  // Fallback: assume plain text or already decompressed
  return await blob.text();
}

export function parseXMLTV(xml: string): XMLTVData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'text/xml');
  const errorNode = doc.querySelector('parsererror');
  if (errorNode) throw new Error('Invalid XMLTV');

  const channels = new Map<string, EPGChannel>();
  const programs = new Map<string, EPGProgram[]>();

  // Channels
  doc.querySelectorAll('tv > channel').forEach((ch) => {
    const id = ch.getAttribute('id') || '';
    if (!id) return;
    const displayName = ch.querySelector('display-name')?.textContent?.trim() || id;
    const iconUrl = ch.querySelector('icon')?.getAttribute('src') || null;
    const country = ch.querySelector('country')?.textContent?.trim() || null;
    channels.set(id, { id, name: displayName, logo: iconUrl, country });
  });

  // Programmes
  doc.querySelectorAll('tv > programme').forEach((p) => {
    const channelId = p.getAttribute('channel') || '';
    const start = parseXMLTVDate(p.getAttribute('start'));
    const stop = parseXMLTVDate(p.getAttribute('stop'));
    if (!channelId || !start) return;
    const end = stop ?? new Date(start.getTime() + 30 * 60 * 1000);
    const title = (p.querySelector('title')?.textContent || 'Sin título').trim();
    const desc = p.querySelector('desc')?.textContent?.trim() || null;
    const cat = p.querySelector('category')?.textContent?.trim() || null;

    const program: EPGProgram = {
      id: `xmltv_${channelId}_${start.getTime()}_${simpleHash(title)}`,
      channelId,
      title,
      description: desc,
      startTime: start,
      endTime: end,
      duration: Math.max(1, Math.round((end.getTime() - start.getTime()) / 60000)),
      genre: cat ? [cat] : null,
    };

    if (!programs.has(channelId)) programs.set(channelId, []);
    programs.get(channelId)!.push(program);
  });

  // Sort programs by startTime per channel
  for (const list of programs.values()) {
    list.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  return { channels, programs };
}


