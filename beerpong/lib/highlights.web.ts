import {
  HIGHLIGHT_LIMIT,
  HIGHLIGHT_SECONDS,
  type HighlightClip,
  type HighlightRecorder,
} from './highlightsShared';

// From the shared module, never from './highlights' — on this platform that
// name resolves to this file, and re-exporting through it is an infinite
// recursion that takes the whole app down. See the note in highlightsShared.ts.
export {
  HIGHLIGHT_LIMIT,
  HIGHLIGHT_SECONDS,
  formatSize,
  type HighlightClip,
  type HighlightRecorder,
} from './highlightsShared';

/**
 * Highlight clips, on the web.
 *
 * The shape of the problem: the good part of a hit is over before anybody
 * could press record, so the camera has to be recording all along and the
 * interesting seconds lifted out afterwards. `MediaRecorder` with a timeslice
 * gives a stream of one-second blobs, and a ring of the last few is exactly
 * the run-up.
 *
 * One thing about that ring is not obvious and is the whole reason this works:
 * **the first blob is special**. It carries the WebM header, and the ones after
 * it are only clusters — so a handful of recent blobs on their own is not a
 * file any player will open. The header is kept aside permanently and stuck on
 * the front of every clip.
 *
 * Clips go into IndexedDB rather than memory, so they survive the app being
 * closed. Capped at a dozen, oldest dropped first: this is a highlight reel of
 * an evening, not an archive, and a phone's storage is not ours to fill.
 */

export const HIGHLIGHTS_SUPPORTED =
  typeof window !== 'undefined' &&
  typeof (window as { MediaRecorder?: unknown }).MediaRecorder !== 'undefined';

const DB_NAME = 'beerpong-highlights';
const STORE = 'clips';
/** One blob a second, so this many entries is this many seconds. */
const CHUNK_MS = 1000;

interface StoredClip {
  id: string;
  at: number;
  seconds: number;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function asPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Blob URLs are handed out on read and revoked when a clip is deleted. */
const urls = new Map<string, string>();

function toClip(stored: StoredClip): HighlightClip {
  let url = urls.get(stored.id);
  if (!url) {
    url = URL.createObjectURL(stored.blob);
    urls.set(stored.id, url);
  }
  return { id: stored.id, at: stored.at, seconds: stored.seconds, size: stored.blob.size, url };
}

export async function listHighlights(): Promise<HighlightClip[]> {
  if (typeof indexedDB === 'undefined') return [];
  try {
    const db = await openDb();
    const all = await asPromise(
      db.transaction(STORE, 'readonly').objectStore(STORE).getAll() as IDBRequest<StoredClip[]>
    );
    db.close();
    return all.sort((a, b) => b.at - a.at).map(toClip);
  } catch {
    // A private window can refuse IndexedDB outright. No clips is a fine
    // answer; a crash on the way into the screen is not.
    return [];
  }
}

export async function deleteHighlight(id: string): Promise<void> {
  const url = urls.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urls.delete(id);
  }
  try {
    const db = await openDb();
    await asPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id));
    db.close();
  } catch {
    // Nothing to do about it, and nothing depends on it having worked.
  }
}

export async function clearHighlights(): Promise<void> {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  try {
    const db = await openDb();
    await asPromise(db.transaction(STORE, 'readwrite').objectStore(STORE).clear());
    db.close();
  } catch {
    /* as above */
  }
}

async function store(clip: StoredClip): Promise<void> {
  const db = await openDb();
  const transaction = db.transaction(STORE, 'readwrite');
  const objectStore = transaction.objectStore(STORE);
  await asPromise(objectStore.put(clip));
  // Oldest out, so the reel stays an evening rather than an archive.
  const all = await asPromise(objectStore.getAll() as IDBRequest<StoredClip[]>);
  if (all.length > HIGHLIGHT_LIMIT) {
    const doomed = all.sort((a, b) => a.at - b.at).slice(0, all.length - HIGHLIGHT_LIMIT);
    for (const old of doomed) await asPromise(objectStore.delete(old.id));
  }
  db.close();
}

/** The preview belongs to expo-camera, so the stream is found rather than made. */
function findStream(): MediaStream | null {
  if (typeof document === 'undefined') return null;
  const videos = Array.from(document.querySelectorAll('video'));
  for (const video of videos) {
    const source = video.srcObject;
    if (source instanceof MediaStream && source.getVideoTracks().length > 0) return source;
  }
  return null;
}

/** The first type the browser will actually give us. Safari and Chrome differ. */
function pickMimeType(): string | undefined {
  const candidates = [
    'video/mp4;codecs=avc1',
    'video/mp4',
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
  ];
  const supported = (window as unknown as { MediaRecorder: typeof MediaRecorder }).MediaRecorder;
  for (const type of candidates) {
    if (typeof supported.isTypeSupported === 'function' && supported.isTypeSupported(type)) {
      return type;
    }
  }
  return undefined;
}

export function createHighlightRecorder(): HighlightRecorder | null {
  if (!HIGHLIGHTS_SUPPORTED) return null;

  let recorder: MediaRecorder | null = null;
  /** The blob carrying the container header; kept for the life of the recorder. */
  let header: Blob | null = null;
  let ring: Blob[] = [];
  let mimeType: string | undefined;
  let stopped = false;
  let attempts = 0;

  const start = () => {
    if (stopped || recorder) return;
    const stream = findStream();
    if (!stream) {
      // The preview takes a moment to come up; try again a few times and then
      // give up quietly rather than polling for the rest of the session.
      attempts += 1;
      if (attempts < 40) setTimeout(start, 400);
      return;
    }
    mimeType = pickMimeType();
    try {
      recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    } catch {
      recorder = null;
      return;
    }
    recorder.ondataavailable = (event) => {
      if (!event.data || event.data.size === 0) return;
      if (!header) {
        header = event.data;
        return;
      }
      ring.push(event.data);
      // One second per blob, plus a little slack so a capture taken just after
      // a hit still reaches back the full window.
      const keep = HIGHLIGHT_SECONDS + 3;
      if (ring.length > keep) ring = ring.slice(-keep);
    };
    recorder.start(CHUNK_MS);
  };

  start();

  return {
    get recording() {
      return recorder?.state === 'recording';
    },

    async capture(): Promise<HighlightClip | null> {
      if (!header || ring.length === 0) return null;
      const parts = [header, ...ring.slice(-HIGHLIGHT_SECONDS)];
      const blob = new Blob(parts, { type: mimeType ?? 'video/webm' });
      const clip: StoredClip = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        at: Date.now(),
        seconds: Math.min(HIGHLIGHT_SECONDS, ring.length),
        blob,
      };
      try {
        await store(clip);
      } catch {
        // Out of quota, or storage refused. The clip is still playable this
        // session, which is better than an error in the middle of a game.
      }
      return toClip(clip);
    },

    stop() {
      stopped = true;
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      recorder = null;
      header = null;
      ring = [];
    },
  };
}
