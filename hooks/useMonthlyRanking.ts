import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { MonthlyPrize, MonthlyRankingEntry } from '@/lib/database.types';

/** First day of the current month, as the database stores the period. */
export function currentPeriod(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

export function formatPeriod(period: string): string {
  const [year, month] = period.split('-');
  return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString('de-AT', {
    month: 'long',
    year: 'numeric',
  });
}

/**
 * The current month's standings plus whatever is up for grabs. Separate from
 * useRanking because the monthly board is not a list of profiles - a player's
 * month score is derived from their tips, not stored on the profile.
 */
export function useMonthlyRanking(period: string = currentPeriod()) {
  const [ranking, setRanking] = useState<MonthlyRankingEntry[]>([]);
  const [prize, setPrize] = useState<MonthlyPrize | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    const [{ data: rows, error: rankError }, { data: prizeRow }] = await Promise.all([
      supabase.rpc('monthly_ranking', { p_period: period }),
      supabase.from('monthly_prizes').select('*').eq('period', period).maybeSingle(),
    ]);

    setError(rankError?.message ?? null);
    setRanking((rows as MonthlyRankingEntry[]) ?? []);
    setPrize((prizeRow as MonthlyPrize) ?? null);
    setLoading(false);
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  return { ranking, prize, period, loading, error, refresh: load };
}
