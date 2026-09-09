import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface StreakReward {
  streak: number;
  xp: number;
  joker: number;
}

export function useDailyLogin() {
  const { session, refreshProfile } = useAuth();
  const [reward, setReward] = useState<StreakReward | null>(null);

  useEffect(() => {
    if (!session) return;

    supabase.rpc('claim_daily_login').then(async ({ data, error }) => {
      if (error) return;
      const result = data?.[0];
      if (!result || result.already_claimed) return;

      await refreshProfile();

      if (result.reward_xp > 0 || result.reward_joker > 0) {
        setReward({ streak: result.streak, xp: result.reward_xp, joker: result.reward_joker });
      }
    });
    // Only claim once per app session / login, not on every profile refresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user.id]);

  return { reward, clearReward: () => setReward(null) };
}
