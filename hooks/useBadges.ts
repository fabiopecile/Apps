import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Badge } from '@/lib/database.types';

export function useBadges(userId?: string) {
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedIds, setEarnedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      // Nach sort_order, damit die leicht erreichbaren Badges vorne stehen -
      // ein Raster in zufälliger Reihenfolge liest sich nicht als Weg.
      supabase.from('badges').select('*').order('sort_order', { ascending: true }),
      userId ? supabase.from('user_badges').select('badge_id').eq('user_id', userId) : Promise.resolve({ data: [] }),
    ]).then(([badgesRes, earnedRes]) => {
      setAllBadges((badgesRes.data as Badge[]) ?? []);
      setEarnedIds(new Set(((earnedRes.data as { badge_id: string }[]) ?? []).map((b) => b.badge_id)));
      setLoading(false);
    });
  }, [userId]);

  return { allBadges, earnedIds, loading };
}
