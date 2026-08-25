import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Conversation, ConversationMember } from '@/lib/database.types';

/**
 * The conversation itself plus everyone in it. The screen used to fetch "the
 * one other participant" with maybeSingle(), which a group of three or more
 * turns into an error.
 */
export function useConversationDetail(conversationId: string | null) {
  const { session } = useAuth();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [members, setMembers] = useState<ConversationMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!conversationId) return;

    const [{ data: conv, error: convError }, { data: rows, error: rowsError }] = await Promise.all([
      supabase.from('conversations').select('*').eq('id', conversationId).single(),
      supabase
        .from('conversation_participants')
        .select('*, profiles(id, username, avatar_url, equipped_frame_color)')
        .eq('conversation_id', conversationId),
    ]);

    setError(convError?.message ?? rowsError?.message ?? null);
    setConversation((conv as Conversation) ?? null);
    setMembers(((rows ?? []) as unknown) as ConversationMember[]);
    setLoading(false);
  }, [conversationId]);

  useEffect(() => {
    load();
  }, [load]);

  const myUserId = session?.user.id;
  const others = members.filter((m) => m.user_id !== myUserId);
  const isGroup = conversation?.is_group ?? false;

  return {
    conversation,
    members,
    others,
    isGroup,
    /** The single counterpart in a 1:1 chat; null in a group. */
    partner: isGroup ? null : (others[0] ?? null),
    isAdmin: members.find((m) => m.user_id === myUserId)?.is_admin ?? false,
    loading,
    error,
    refresh: load,
  };
}
