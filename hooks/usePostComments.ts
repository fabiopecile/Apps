import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PostCommentWithAuthor } from '@/lib/database.types';

export function usePostComments(postId: string | null) {
  const { session } = useAuth();
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(id, username, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setComments((data as any) ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (postId) load();
    else setComments([]);
  }, [postId, load]);

  const postComment = async (content: string) => {
    if (!session || !postId || !content.trim()) return;
    await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      content: content.trim(),
    });
    await load();
  };

  return { comments, loading, postComment };
}
