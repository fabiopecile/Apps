import AsyncStorage from '@react-native-async-storage/async-storage';

import { ONLINE_AVAILABLE, ONLINE_SERVER_URL } from './onlineConfig';
import { normaliseSaveCode } from './saveCode';
import { STORAGE_KEY } from './store';

/**
 * Keeping a copy of the save somewhere that is not this phone.
 *
 * What gets sent is **the exact blob the app already persists**, not a
 * hand-picked subset of it. That is deliberate: a subset is a second
 * definition of "what a save is", and the two drift apart the first time
 * somebody adds a field and forgets this file. Reading and writing the same
 * string the storage layer uses means backup and restore cannot disagree with
 * the app about what was saved.
 *
 * It also means the unlock code travels with it. That is the right call — a
 * restore that brings back your coins but not your purchase is not a restore —
 * and it is why the screen says plainly that the save code is private. Anyone
 * holding it holds the save.
 */

export interface CloudSave {
  updatedAt: number;
  state: string;
}

export type PushResult = 'ok' | 'stale' | 'failed' | 'off';

function saveUrl(code: string): string {
  return `${ONLINE_SERVER_URL}/save/${normaliseSaveCode(code)}`;
}

/** The blob as it sits in storage right now, or null if nothing is saved yet. */
export async function readLocalSave(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

export async function pushSave(code: string): Promise<PushResult> {
  if (!ONLINE_AVAILABLE) return 'off';
  const state = await readLocalSave();
  if (!state) return 'failed';
  try {
    const response = await fetch(saveUrl(code), {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ state, updatedAt: Date.now() }),
    });
    if (response.status === 409) return 'stale';
    return response.ok ? 'ok' : 'failed';
  } catch {
    return 'failed';
  }
}

/** What is on the server for this code, without touching anything local. */
export async function fetchSave(code: string): Promise<CloudSave | null> {
  if (!ONLINE_AVAILABLE) return null;
  try {
    const response = await fetch(saveUrl(code));
    if (!response.ok) return null;
    const data = (await response.json()) as { found?: boolean; updatedAt?: number; state?: string };
    if (!data.found || typeof data.state !== 'string') return null;
    return { updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : 0, state: data.state };
  } catch {
    return null;
  }
}

/**
 * Replaces everything on this device with what the server holds.
 *
 * The caller must have asked first: this is not a merge and it cannot be
 * undone. The app is reloaded afterwards rather than rehydrated in place,
 * because half the screens hold derived state that was computed from the save
 * being replaced underneath them.
 */
export async function applySave(save: CloudSave): Promise<boolean> {
  try {
    JSON.parse(save.state);
  } catch {
    // Not a save. Better to refuse than to write rubbish over a working one.
    return false;
  }
  try {
    await AsyncStorage.setItem(STORAGE_KEY, save.state);
    return true;
  } catch {
    return false;
  }
}

/** Forgets the copy on the server. The local save is untouched. */
export async function deleteSave(code: string): Promise<boolean> {
  if (!ONLINE_AVAILABLE) return false;
  try {
    const response = await fetch(saveUrl(code), { method: 'DELETE' });
    return response.ok;
  } catch {
    return false;
  }
}
