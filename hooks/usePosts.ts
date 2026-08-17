import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PostWithAuthor } from '@/lib/database.types';

export function usePosts() {
  const { session } = useAuth();
  const [posts, setPosts] = useState<PostWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const { data, error: fetchError } = await supabase
      .from('posts')
      .select('*, profiles!posts_user_id_fkey(id, username, avatar_url), post_likes(user_id)')
      .order('created_at', { ascending: false })
      .limit(30);

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    const mapped: PostWithAuthor[] = (data ?? []).map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      image_url: row.image_url,
      caption: row.caption,
      location: row.location,
      created_at: row.created_at,
      profiles: row.profiles,
      like_count: row.post_likes?.length ?? 0,
      liked_by_me: !!row.post_likes?.some((l: { user_id: string }) => l.user_id === session?.user.id),
    }));

    setPosts(mapped);
    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleLike = async (post: PostWithAuthor) => {
    if (!session) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === post.id
          ? { ...p, liked_by_me: !p.liked_by_me, like_count: p.like_count + (p.liked_by_me ? -1 : 1) }
          : p
      )
    );

    if (post.liked_by_me) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', session.user.id);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: session.user.id });
    }
  };

  const createPost = async (input: { caption: string; location?: string; image_url?: string }) => {
    if (!session) return { error: 'not signed in' };
    const { error: insertError } = await supabase.from('posts').insert({
      user_id: session.user.id,
      caption: input.caption,
      location: input.location ?? null,
      image_url: input.image_url ?? null,
    });
    if (insertError) return { error: insertError.message };

    // A post with a photo also shows up as the author's story circle.
    if (input.image_url) {
      await supabase.from('stories').insert({
        user_id: session.user.id,
        media_url: input.image_url,
      });
    }

    await load();
    return { error: null };
  };

  return { posts, loading, error, refresh: load, toggleLike, createPost };
}
