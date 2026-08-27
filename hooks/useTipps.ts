import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { JokerType, League, Match, Matchday, Tip } from '@/lib/database.types';

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

/**
 * The matches of one matchday, plus everything needed to move between rounds.
 *
 * `selectedMatchdayId` is optional: leave it null and the hook shows the round
 * that is current right now. Passing an id only overrides that choice, so the
 * default stays "the current round" no matter which league is picked.
 */
export function useMatchday(leagueId: string | null, selectedMatchdayId?: string | null) {
  const { session, profile, refreshProfile } = useAuth();
  const [matchdays, setMatchdays] = useState<Matchday[]>([]);
  const [matchday, setMatchday] = useState<Matchday | null>(null);
  const [currentMatchdayId, setCurrentMatchdayId] = useState<string | null>(null);
  const [matches, setMatches] = useState<MatchWithTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!leagueId) return;
    setLoading(true);
    setError(null);

    const { data: matchdayRows, error: mdError } = await supabase
      .from('matchdays')
      .select('*')
      .eq('league_id', leagueId);

    if (mdError || !matchdayRows?.length) {
      setMatchdays([]);
      setMatchday(null);
      setCurrentMatchdayId(null);
      setMatches([]);
      setLoading(false);
      if (mdError) setError(mdError.message);
      return;
    }

    // Sorted by deadline, not by number: real fixtures don't always play in
    // strict round order (rescheduled games for clubs in European
    // competitions, etc.), so the round number alone is not a timeline.
    const allMatchdays = (matchdayRows as Matchday[]).sort(
      (a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime()
    );
    setMatchdays(allMatchdays);

    // The round closest to "now" — the one still open, or the last one played.
    const now = Date.now();
    const currentMatchday =
      allMatchdays.find((m) => new Date(m.deadline).getTime() >= now) ??
      allMatchdays[allMatchdays.length - 1];
    setCurrentMatchdayId(currentMatchday.id);

    // A round the user picked by hand wins, but only while it belongs to this
    // league — after switching leagues the stale id falls back to "current".
    const activeMatchday =
      allMatchdays.find((m) => m.id === selectedMatchdayId) ?? currentMatchday;

    setMatchday(activeMatchday);

    const { data: matchRows, error: matchError } = await supabase
      .from('matches')
      .select('*, tips(*)')
      .eq('matchday_id', activeMatchday.id)
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
  }, [leagueId, selectedMatchdayId, session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const submitTip = async (
    matchId: string,
    homeScore: number,
    awayScore: number,
    jokerType: JokerType | null
  ): Promise<{ error: string | null }> => {
    if (!session) return { error: 'not signed in' };

    const existing = matches.find((m) => m.id === matchId)?.tip;
    const jokerChanged = (existing?.joker_type ?? null) !== jokerType;

    if (existing) {
      const { error: updateError } = await supabase
        .from('tips')
        .update({
          home_score: homeScore,
          away_score: awayScore,
          joker_type: jokerType,
          is_joker: jokerType !== null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existing.id);
      if (updateError) return { error: updateError.message };
    } else {
      const { error: insertError } = await supabase.from('tips').insert({
        user_id: session.user.id,
        match_id: matchId,
        home_score: homeScore,
        away_score: awayScore,
        joker_type: jokerType,
        is_joker: jokerType !== null,
      });
      if (insertError) return { error: insertError.message };
    }

    await load();
    if (jokerChanged) await refreshProfile();
    return { error: null };
  };

  return {
    matchday,
    matchdays,
    currentMatchdayId,
    matches,
    loading,
    error,
    refresh: load,
    submitTip,
    jokersRemaining: profile?.jokers_remaining ?? 0,
  };
}
