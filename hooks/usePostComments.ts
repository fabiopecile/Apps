import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { PostCommentWithAuthor } from '@/lib/database.types';

export function usePostComments(postId: string | null) {
  const { session } = useAuth();
  const [comments, setComments] = useState<PostCommentWithAuthor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!postId) return;
    setLoading(true);
    const { data, error: loadError } = await supabase
      .from('post_comments')
      .select('*, profiles!post_comments_user_id_fkey(id, username, avatar_url, equipped_frame_color)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    setError(loadError?.message ?? null);
    setComments((data as any) ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    if (postId) load();
    else setComments([]);
  }, [postId, load]);

  const postComment = async (content: string) => {
    if (!session || !postId || !content.trim()) return;
    const { error: insertError } = await supabase.from('post_comments').insert({
      post_id: postId,
      user_id: session.user.id,
      content: content.trim(),
    });
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setError(null);
    await load();
  };

  const deleteComment = async (commentId: string) => {
    // Optimistic: the row is gone from the list immediately, and comes back
    // on the reload if the delete was rejected.
    setComments((current) => current.filter((c) => c.id !== commentId));
    const { error: deleteError } = await supabase.from('post_comments').delete().eq('id', commentId);
    if (deleteError) setError(deleteError.message);
    await load();
  };

  return { comments, loading, error, postComment, deleteComment };
}
