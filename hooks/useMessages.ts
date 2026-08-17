import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Message } from '@/lib/database.types';

export function useMessages(conversationId: string) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    setMessages((data as Message[]) ?? []);
    setLoading(false);

    if (session) {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', session.user.id);
    }
  }, [conversationId, session]);

  useEffect(() => {
    load();

    // Unique per effect run (not just per conversation) so a channel from a
    // still-in-flight cleanup (React Strict Mode's double-invoke, a quick
    // session refresh re-triggering this effect, etc.) can never collide
    // with this one under the same topic.
    const channel = supabase
      .channel(`messages:${conversationId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, load]);

  const sendMessage = async (content: string) => {
    if (!session || !content.trim()) return;
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: session.user.id,
      content: content.trim(),
    });
  };

  return { messages, loading, sendMessage };
}
