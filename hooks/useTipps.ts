import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { League, Match, Matchday, Tip } from '@/lib/database.types';

export interface MatchWithTip extends Match {
  tip: Tip | null;
}

export function useLeagues() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('leagues')
      .select('*')
      .order('sort_order', { ascending: true })
      .then(({ data }) => {
        setLeagues((data as League[]) ?? []);
        setLoading(false);
      });
  }, []);

  return { leagues, loading };
}

export function useMatchday(leagueId: string | null) {
  const { session, profile, refreshProfile } = useAuth();
  const [matchday, setMatchday] = useState<Matchday | null>(null);
  const [matches, setMatches] = useState<MatchWithTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);

    const { data: matchdays, error: mdError } = await supabase
      .from('matchdays')
      .select('*')
      .eq('league_id', leagueId)
      .order('number', { ascending: false })
      .limit(1);

    if (mdError || !matchdays?.length) {
      setMatchday(null);
      setMatches([]);
      setLoading(false);
      if (mdError) setError(mdError.message);
      return;
    }

    const currentMatchday = matchdays[0] as Matchday;
    setMatchday(currentMatchday);

    const { data: matchRows, error: matchError } = await supabase
      .from('matches')
      .select('*, tips(*)')
      .eq('matchday_id', currentMatchday.id)
      .order('kickoff', { ascending: true });

    if (matchError) {
      setError(matchError.message);
      setLoading(false);
      return;
    }

    const mapped: MatchWithTip[] = (matchRows ?? []).map((row: any) => {
      const myTip = (row.tips as Tip[]).find((t) => t.user_id === session?.user.id) ?? null;
      const { tips: _tips, ...match } = row;
      return { ...(match as Match), tip: myTip };
    });

    setMatches(mapped);
    setLoading(false);
  }, [leagueId, session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitTip = async (
    matchId: string,
    homeScore: number,
    awayScore: number,
    isJoker: boolean
  ): Promise<{ error: string | null }> => {
    if (!session) return { error: 'not signed in' };

    const existing = matches.find((m) => m.id === matchId)?.tip;

    if (existing) {
      const { error: updateError } = await supabase
        .from('tips')
        .update({ home_score: homeScore, away_score: awayScore, is_joker: isJoker, updated_at: new Date().toISOString() })
        .eq('id', existing.id);
      if (updateError) return { error: updateError.message };
    } else {
      const { error: insertError } = await supabase.from('tips').insert({
        user_id: session.user.id,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        is_joker: isJoker,
      });
      if (insertError) return { error: insertError.message };
    }

    await load();
    if (isJoker && !existing) await refreshProfile();
    return { error: null };
  };

  return { matchday, matches, loading, error, refresh: load, submitTip, jokersRemaining: profile?.jokers_remaining ?? 0 };
}
