import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/database.types';

export function useOwnPosts(userId?: string) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPosts((data as Post[]) ?? []);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { posts, loading, refresh: load };
}
