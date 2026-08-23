import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { DuelWithDetails, Message } from '@/lib/database.types';

export function useChatDuels(messages: Message[]) {
  const { session } = useAuth();
  const [duels, setDuels] = useState<Record<string, DuelWithDetails>>({});
  const knownIds = useRef<Set<string>>(new Set());

  const fetchDuels = useCallback(async (ids: string[]) => {
    if (!ids.length) return;

    const { data } = await supabase
      .from('duels')
      .select(
        '*, challenger:profiles!duels_challenger_id_fkey(id, username, avatar_url, equipped_frame_color), opponent:profiles!duels_opponent_id_fkey(id, username, avatar_url, equipped_frame_color), matchday:matchdays(*, league:leagues(*))'
      )
      .in('id', ids);

    const rows = data ?? [];
    const { data: scores } = await supabase.from('duel_scores').select('*').in('duel_id', ids);
    const scoreMap = new Map((scores ?? []).map((s: any) => [s.duel_id, s]));

    setDuels((prev) => {
      const next = { ...prev };
      for (const row of rows as any[]) {
        next[row.id] = {
          ...row,
          challenger_points: scoreMap.get(row.id)?.challenger_points ?? 0,
          opponent_points: scoreMap.get(row.id)?.opponent_points ?? 0,
        };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const newIds = messages
      .map((m) => m.duel_id)
      .filter((id): id is string => !!id && !knownIds.current.has(id));
    if (newIds.length) {
      newIds.forEach((id) => knownIds.current.add(id));
      fetchDuels(newIds);
    }
  }, [messages, fetchDuels]);

  useEffect(() => {
    const userId = session?.user.id;
    if (!userId) return;

    const handleUpdate = (payload: { new: unknown }) => {
      const id = (payload.new as { id: string }).id;
      if (knownIds.current.has(id)) fetchDuels([id]);
    };

    // Filtered server-side to the duels this user is actually in. Without the
    // filter every client received every duel update in the app and threw
    // almost all of them away - fine with a handful of users, wasteful with
    // many. Realtime filters can't express OR, so it takes two listeners on
    // the one channel.
    //
    // The channel name is unique per mount so a still-cleaning-up channel from
    // a previous mount (React Strict Mode's double-invoke, fast remounts) can
    // never collide with this one under the same topic.
    const channel = supabase
      .channel(`chat-duel-updates:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels', filter: `challenger_id=eq.${userId}` },
        handleUpdate
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'duels', filter: `opponent_id=eq.${userId}` },
        handleUpdate
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDuels, session?.user.id]);

  return duels;
}
