import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/lib/database.types';

export interface ConversationSummary {
  id: string;
  otherUser: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'> | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unread: boolean;
}

export function useConversations() {
  const { session } = useAuth();
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }
    setError(null);

    const { data: myParticipation, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', session.user.id);

    if (partError) {
      setError(partError.message);
      setLoading(false);
      return;
    }

    const conversationIds = (myParticipation ?? []).map((p) => p.conversation_id);
    if (!conversationIds.length) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const [{ data: others }, { data: lastMessages }] = await Promise.all([
      supabase
        .from('conversation_participants')
        .select('conversation_id, profiles(id, username, avatar_url, equipped_frame_color)')
        .in('conversation_id', conversationIds)
        .neq('user_id', session.user.id),
      supabase
        .from('messages')
        .select('conversation_id, content, created_at, sender_id')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: false }),
    ]);

    const lastReadMap = new Map((myParticipation ?? []).map((p) => [p.conversation_id, p.last_read_at]));
    const otherUserMap = new Map((others ?? []).map((o: any) => [o.conversation_id, o.profiles]));
    const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    for (const m of lastMessages ?? []) {
      if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m as any);
    }

    const summaries: ConversationSummary[] = conversationIds.map((id) => {
      const last = lastMessageMap.get(id);
      const lastRead = lastReadMap.get(id);
      return {
        id,
        otherUser: otherUserMap.get(id) ?? null,
        lastMessage: last?.content ?? null,
        lastMessageAt: last?.created_at ?? null,
        unread: !!last && last.sender_id !== session.user.id && (!lastRead || new Date(last.created_at) > new Date(lastRead)),
      };
    });

    summaries.sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
    setConversations(summaries);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();
  }, [load]);

  return { conversations, loading, error, refresh: load };
}
