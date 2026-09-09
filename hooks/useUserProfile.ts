import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Post, Profile } from '@/lib/database.types';

export function useUserProfile(userId?: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    const [{ data: profileRow }, { data: postRows }, { count: followers }, { count: following }] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
      supabase.from('posts').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId),
    ]);

    setProfile((profileRow as Profile) ?? null);
    setPosts((postRows as Post[]) ?? []);
    setFollowerCount(followers ?? 0);
    setFollowingCount(following ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { profile, posts, followerCount, followingCount, loading, refresh: load };
}
