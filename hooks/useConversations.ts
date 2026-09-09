import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile } from '@/lib/database.types';

type MemberProfile = Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;

export interface ConversationSummary {
  id: string;
  isGroup: boolean;
  /** The group's name, or null for a 1:1 chat. */
  title: string | null;
  /** Everyone except you. One entry for a 1:1 chat, several for a group. */
  others: MemberProfile[];
  /** The single counterpart in a 1:1 chat; null for groups. */
  otherUser: MemberProfile | null;
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

    const [{ data: others }, { data: lastMessages }, { data: conversationRows }] = await Promise.all([
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
      supabase.from('conversations').select('id, is_group, title').in('id', conversationIds),
    ]);

    const lastReadMap = new Map((myParticipation ?? []).map((p) => [p.conversation_id, p.last_read_at]));
    // A group has several counterparts, so these collect into a list. The old
    // one-entry-per-conversation map silently kept whichever member came last.
    const othersMap = new Map<string, MemberProfile[]>();
    for (const row of (others ?? []) as any[]) {
      if (!row.profiles) continue;
      const list = othersMap.get(row.conversation_id) ?? [];
      list.push(row.profiles);
      othersMap.set(row.conversation_id, list);
    }
    const conversationMap = new Map(
      ((conversationRows ?? []) as { id: string; is_group: boolean; title: string | null }[]).map((c) => [c.id, c])
    );
    const lastMessageMap = new Map<string, { content: string; created_at: string; sender_id: string }>();
    for (const m of lastMessages ?? []) {
      if (!lastMessageMap.has(m.conversation_id)) lastMessageMap.set(m.conversation_id, m as any);
    }

    const summaries: ConversationSummary[] = conversationIds.map((id) => {
      const last = lastMessageMap.get(id);
      const lastRead = lastReadMap.get(id);
      const meta = conversationMap.get(id);
      const others = othersMap.get(id) ?? [];
      const isGroup = meta?.is_group ?? false;
      return {
        id,
        isGroup,
        title: meta?.title ?? null,
        others,
        otherUser: isGroup ? null : (others[0] ?? null),
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
