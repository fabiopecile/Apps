import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

// Loads who the signed-in user follows once, so a feed full of posts can show
// the right Folgen/Gefolgt state without one query per post.
export function useFollows() {
  const { session } = useAuth();
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!session) {
      setFollowingIds(new Set());
      setLoading(false);
      return;
    }
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', session.user.id);
    setFollowingIds(new Set((data ?? []).map((row) => row.following_id)));
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const isFollowing = useCallback((userId: string) => followingIds.has(userId), [followingIds]);

  const toggleFollow = useCallback(
    async (userId: string) => {
      if (!session || userId === session.user.id) return { error: null };

      const wasFollowing = followingIds.has(userId);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (wasFollowing) next.delete(userId);
        else next.add(userId);
        return next;
      });

      const { error } = wasFollowing
        ? await supabase.from('follows').delete().eq('follower_id', session.user.id).eq('following_id', userId)
        : await supabase.from('follows').insert({ follower_id: session.user.id, following_id: userId });

      if (error) await load(); // revert to whatever the server actually has
      return { error: error?.message ?? null };
    },
    [session?.user.id, followingIds, load]
  );

  return { followingIds, isFollowing, toggleFollow, loading, refresh: load };
}
