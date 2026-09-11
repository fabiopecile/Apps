import { useEffect, useRef } from 'react';

import { ONLINE_AVAILABLE } from './onlineConfig';
import { pushSave, readLocalSave } from './cloudSave';
import { useBeerpongStore } from './store';

/**
 * Keeps the copy on the server up to date, without anybody pressing anything.
 *
 * A "back up now" button is a button people forget, and the whole complaint
 * this answers is that things disappear. So it runs on every change, quietly.
 *
 * Two timers rather than one. The short one waits for a quiet moment, because
 * a match writes to the store on every single throw and backing up thirty
 * times in three minutes is pointless. The long one is the ceiling: a session
 * that never goes quiet still gets written down once a minute, so a phone that
 * dies mid-tournament loses a minute rather than an evening.
 */

/** How long the store has to be still before a backup goes out. */
const QUIET_MS = 4000;
/** How long a busy session can go without one anyway. */
const MAX_WAIT_MS = 60000;

export function useCloudBackup(): void {
  const hasHydrated = useBeerpongStore((s) => s.hasHydrated);
  const saveCode = useBeerpongStore((s) => s.saveCode);
  const setLastSyncAt = useBeerpongStore((s) => s.setLastSyncAt);
  /**
   * The blob as it was last sent.
   *
   * Compared against the current one before every push, which is what keeps
   * this from chasing its own tail: recording the sync time is itself a store
   * change, and without this it would schedule the next backup forever.
   */
  const lastPushed = useRef<string | null>(null);

  useEffect(() => {
    if (!hasHydrated || !saveCode || !ONLINE_AVAILABLE) return;

    let quiet: ReturnType<typeof setTimeout> | null = null;
    let ceiling: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const clear = () => {
      if (quiet) clearTimeout(quiet);
      if (ceiling) clearTimeout(ceiling);
      quiet = null;
      ceiling = null;
    };

    const run = async () => {
      clear();
      if (stopped) return;
      const current = await readLocalSave();
      if (!current || current === lastPushed.current) return;
      const result = await pushSave(saveCode);
      if (stopped) return;
      if (result === 'ok') {
        lastPushed.current = current;
        setLastSyncAt(Date.now());
      }
      // 'stale' means another device wrote something newer, and 'failed' is
      // usually no signal. Both are fine to leave alone: the next change
      // schedules another attempt, and nothing local was touched.
    };

    const schedule = () => {
      if (quiet) clearTimeout(quiet);
      quiet = setTimeout(run, QUIET_MS);
      if (!ceiling) ceiling = setTimeout(run, MAX_WAIT_MS);
    };

    // One on the way in, so a device that just had its code entered is backed
    // up immediately rather than at the next throw.
    run();
    const unsubscribe = useBeerpongStore.subscribe(schedule);

    return () => {
      stopped = true;
      clear();
      unsubscribe();
    };
  }, [hasHydrated, saveCode, setLastSyncAt]);
}
