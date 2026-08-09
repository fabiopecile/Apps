import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Badge } from '@/lib/database.types';

export function useBadges(userId?: string) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      supabase.from('badges').select('*'),
      userId ? supabase.from('user_badges').select('badge_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
    ]).then(([badgesRes, earnedRes]) => {
      setAllBadges((badgesRes.data as Badge[]) ?? []);
      setEarnedIds(new Set(((earnedRes.data as { badge_id: string }[]) ?? []).map((b) => b.badge_id)));
      setLoading(false);
    });
  }, [userId]);

  return { allBadges, earnedIds, loading };
}
