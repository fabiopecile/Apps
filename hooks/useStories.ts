import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Profile, Story } from '@/lib/database.types';

export interface StoryWithAuthor extends Story {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
}

export function useStories() {
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, profiles!stories_user_id_fkey(id, username, avatar_url)')
      .order('created_at', { ascending: false });
    setStories((data as any) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { stories, loading, refresh: load };
}
