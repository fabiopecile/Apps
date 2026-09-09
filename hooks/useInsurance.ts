import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { TipInsurance } from '@/lib/database.types';

/** What one policy costs, and what it guarantees per tipped match. */
export const INSURANCE_COST = 150;

/**
 * Only coins that were earned can pay for an insurance. The database enforces
 * that too - this is here so the button can be disabled with an honest reason
 * instead of failing on the tap.
 */
export function earnedCoins(profile: { coins: number; purchased_coins?: number } | null | undefined): number {
  if (!profile) return 0;
  return Math.max(0, profile.coins - (profile.purchased_coins ?? 0));
}

export function useInsurance(matchdayId: string | null) {
  const { session, profile, refreshProfile } = useAuth();
  const [insurance, setInsurance] = useState<TipInsurance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);

  const load = useCallback(async () => {
    if (!matchdayId || !session) {
      setInsurance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('tip_insurances')
      .select('*')
      .eq('matchday_id', matchdayId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    setError(loadError?.message ?? null);
    setInsurance((data as TipInsurance) ?? null);
    setLoading(false);
  }, [matchdayId, session]);

  useEffect(() => {
    load();
  }, [load]);

  const buy = useCallback(async (): Promise<{ error: string | null }> => {
    if (!matchdayId) return { error: 'Kein Spieltag ausgewählt' };
    setBuying(true);
    const { data, error: rpcError } = await supabase.rpc('insure_matchday', {
      p_matchday_id: matchdayId,
    });
    setBuying(false);

    if (rpcError) return { error: rpcError.message };

    setInsurance((data as TipInsurance) ?? null);
    // The balance just changed - the coin counter in the top bar reads it from
    // the profile, so it has to be re-fetched or it would show the old number.
    await refreshProfile();
    return { error: null };
  }, [matchdayId, refreshProfile]);

  return {
    insurance,
    loading,
    error,
    buying,
    buy,
    refresh: load,
    cost: INSURANCE_COST,
    available: earnedCoins(profile),
  };
}
