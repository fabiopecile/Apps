import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Tip } from '@/lib/database.types';

export interface TipWithAuthor extends Tip {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'> | null;
}

/**
 * Everyone's tips for one match. The RLS policy on `tips` already only hands
 * these out once kickoff has passed, so nobody can copy before the deadline -
 * this hook just needs to not ask before there is something to show.
 */
export function useMatchTips(matchId: string | null, enabled: boolean) {
  const [tips, setTips] = useState<TipWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!matchId || !enabled) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('tips')
      .select('*, profiles!tips_user_id_fkey(id, username, avatar_url, equipped_frame_color)')
      .eq('match_id', matchId);

    setError(loadError?.message ?? null);
    const rows = ((data ?? []) as unknown) as TipWithAuthor[];

    // Best tips first; unscored ones (match not settled yet) keep their
    // relative order under the scored ones rather than sorting as zero.
    rows.sort((a, b) => {
      const ap = a.points_earned ?? -1;
      const bp = b.points_earned ?? -1;
      if (ap !== bp) return bp - ap;
      return (a.profiles?.username ?? '').localeCompare(b.profiles?.username ?? '');
    });

    setTips(rows);
    setLoading(false);
  }, [matchId, enabled]);

  useEffect(() => {
    load();
  }, [load]);

  return { tips, loading, error, refresh: load };
}
