import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PrivateLeague } from '@/lib/database.types';

export function usePrivateLeagues() {
  const { session } = useAuth();
  const [leagues, setLeagues] = useState<PrivateLeague[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('private_leagues').select('*').order('created_at', { ascending: false });
    setLeagues((data as PrivateLeague[]) ?? []);
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const createLeague = async (name: string) => {
    const { data, error } = await supabase.rpc('create_private_league', { p_name: name });
    if (!error) await load();
    return { league: (data as PrivateLeague) ?? null, error: error?.message ?? null };
  };

  const joinLeague = async (code: string) => {
    const { data, error } = await supabase.rpc('join_private_league', { p_code: code });
    if (!error) await load();
    return { league: (data as PrivateLeague) ?? null, error: error?.message ?? null };
  };

  return { leagues, loading, refresh: load, createLeague, joinLeague };
}
