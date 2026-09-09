import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/lib/database.types';

export function useRanking(scope: 'gesamt' | 'freunde') {
  const { session } = useAuth();
  const [ranking, setRanking] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (scope === 'gesamt') {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .order('points', { ascending: false })
        .limit(50);

      if (fetchError) setError(fetchError.message);
      setRanking((data as Profile[]) ?? []);
      setLoading(false);
      return;
    }

    if (!session) {
      setRanking([]);
      setLoading(false);
      return;
    }

    const { data: follows, error: followError } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', session.user.id);

    if (followError) {
      setError(followError.message);
      setLoading(false);
      return;
    }

    const ids = [...(follows ?? []).map((f) => f.following_id), session.user.id];
    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .in('id', ids)
      .order('points', { ascending: false });

    if (fetchError) setError(fetchError.message);
    setRanking((data as Profile[]) ?? []);
    setLoading(false);
  }, [scope, session]);

  useEffect(() => {
    load();
  }, [load]);

  return { ranking, loading, error, refresh: load };
}
