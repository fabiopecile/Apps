import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { FriendRequestWithProfiles } from '@/lib/database.types';

export function useFriendRequests() {
  const { session } = useAuth();
  const [incoming, setIncoming] = useState<FriendRequestWithProfiles[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('friend_requests')
      .select(
        '*, sender:profiles!friend_requests_sender_id_fkey(id, username, avatar_url, equipped_frame_color), recipient:profiles!friend_requests_recipient_id_fkey(id, username, avatar_url, equipped_frame_color)'
      )
      .eq('recipient_id', session.user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    setIncoming((data as any) ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    load();

    if (!session) return;
    const userId = session.user.id;
    // Unique per effect run (not just per user) so a channel from a still-
    // in-flight cleanup (e.g. React Strict Mode's double-invoke, or a quick
    // session refresh) can never collide with this one under the same topic.
    const channel = supabase
      .channel(`friend-requests:${userId}:${Date.now()}:${Math.random().toString(36).slice(2)}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friend_requests', filter: `recipient_id=eq.${userId}` },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, session?.user.id]);

  const sendRequest = async (recipientId: string) => {
    if (!session) return { error: 'not signed in' };
    const { error } = await supabase.from('friend_requests').insert({
      sender_id: session.user.id,
      recipient_id: recipientId,
    });
    return { error: error?.message ?? null };
  };

  const respond = async (requestId: string, accept: boolean) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: accept ? 'accepted' : 'declined' })
      .eq('id', requestId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  return { incoming, loading, sendRequest, respond, refresh: load };
}
