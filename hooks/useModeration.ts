import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export type ReportTarget = 'post' | 'story' | 'comment' | 'user';

export const REPORT_REASONS = [
  'Beleidigend oder hetzerisch',
  'Gewalt oder Bedrohung',
  'Sexuelle oder anstößige Inhalte',
  'Spam oder Werbung',
  'Kein Fußballbezug',
  'Etwas anderes',
] as const;

export function useModeration() {
  const { session } = useAuth();
  const [blockedIds, setBlockedIds] = useState<Set<string>>(new Set());

  const loadBlocks = useCallback(async () => {
    if (!session) return;
    const { data } = await supabase.from('blocks').select('blocked_id').eq('blocker_id', session.user.id);
    setBlockedIds(new Set((data ?? []).map((row) => row.blocked_id)));
  }, [session?.user.id]);

  useEffect(() => {
    loadBlocks();
  }, [loadBlocks]);

  const report = async (targetType: ReportTarget, targetId: string, reason: string) => {
    if (!session) return { error: 'Nicht angemeldet' };
    const { error } = await supabase.from('reports').insert({
      reporter_id: session.user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
    });
    // Reporting the same thing twice hits the unique constraint - that's the
    // user's report already being on file, not a failure worth showing.
    if (error && error.code === '23505') return { error: null };
    return { error: error?.message ?? null };
  };

  const blockUser = async (userId: string) => {
    if (!session) return { error: 'Nicht angemeldet' };
    const { error } = await supabase
      .from('blocks')
      .insert({ blocker_id: session.user.id, blocked_id: userId });
    if (!error) await loadBlocks();
    return { error: error?.message ?? null };
  };

  const unblockUser = async (userId: string) => {
    if (!session) return { error: 'Nicht angemeldet' };
    const { error } = await supabase
      .from('blocks')
      .delete()
      .eq('blocker_id', session.user.id)
      .eq('blocked_id', userId);
    if (!error) await loadBlocks();
    return { error: error?.message ?? null };
  };

  const isBlocked = useCallback((userId: string) => blockedIds.has(userId), [blockedIds]);

  return { report, blockUser, unblockUser, isBlocked, blockedIds, refreshBlocks: loadBlocks };
}
