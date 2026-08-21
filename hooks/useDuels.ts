import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DuelType, DuelWithDetails } from '@/lib/database.types';

const DUEL_LABELS: Record<DuelType, string> = {
  tips: '🎯 Tipp-Duell',
  xp: '🏆 Punktewettkampf',
  streak: '🔥 Streak-Battle',
};

export function useDuels() {
  const { session } = useAuth();
  const [duels, setDuels] = useState<DuelWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('duels')
      .select(
        '*, challenger:profiles!duels_challenger_id_fkey(id, username, avatar_url, equipped_frame_color), opponent:profiles!duels_opponent_id_fkey(id, username, avatar_url, equipped_frame_color), matchday:matchdays(*, league:leagues(*))'
      )
      .or(`challenger_id.eq.${session.user.id},opponent_id.eq.${session.user.id}`)
      .order('created_at', { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const rows = data ?? [];
    const ids = rows.map((d: any) => d.id);

    const { data: scores } = ids.length
      ? await supabase.from('duel_scores').select('*').in('duel_id', ids)
      : { data: [] };
    const scoreMap = new Map((scores ?? []).map((s: any) => [s.duel_id, s]));

    setDuels(
      rows.map((d: any) => ({
        ...d,
        challenger_points: scoreMap.get(d.id)?.challenger_points ?? 0,
        opponent_points: scoreMap.get(d.id)?.opponent_points ?? 0,
      }))
    );
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  const challenge = async (opponentId: string, matchdayId: string, duelType: DuelType = 'tips') => {
    if (!session) return { error: 'not signed in' };
    const { error } = await supabase.from('duels').insert({
      challenger_id: session.user.id,
      opponent_id: opponentId,
      matchday_id: matchdayId,
      duel_type: duelType,
    });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  /** Challenge sent from a chat thread: picks the next upcoming matchday automatically
   * and posts a message that renders as a challenge card in that conversation. */
  const challengeFromChat = async (opponentId: string, duelType: DuelType, conversationId: string) => {
    if (!session) return { error: 'not signed in' };

    const { data: matchdays, error: matchdayError } = await supabase
      .from('matchdays')
      .select('*')
      .gt('deadline', new Date().toISOString())
      .order('deadline', { ascending: true })
      .limit(1);

    if (matchdayError) return { error: matchdayError.message };
    if (!matchdays?.length) return { error: 'Kein bevorstehender Spieltag verfügbar' };

    const { data: duel, error: duelError } = await supabase
      .from('duels')
      .insert({
        challenger_id: session.user.id,
        opponent_id: opponentId,
        matchday_id: matchdays[0].id,
        duel_type: duelType,
      })
      .select()
      .single();

    if (duelError || !duel) return { error: duelError?.message ?? 'Duell konnte nicht erstellt werden' };

    const { error: messageError } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      content: DUEL_LABELS[duelType],
      duel_id: duel.id,
    });

    if (messageError) return { error: messageError.message };

    await load();
    return { error: null };
  };

  const respond = async (duelId: string, accept: boolean) => {
    const { error } = await supabase
      .from('duels')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', duelId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const cancel = async (duelId: string) => {
    const { error } = await supabase.from('duels').update({ status: 'cancelled' }).eq('id', duelId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  return { duels, loading, error, refresh: load, challenge, challengeFromChat, respond, cancel };
}
