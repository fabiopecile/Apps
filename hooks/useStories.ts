import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Profile, Story } from '@/lib/database.types';

export interface StoryWithAuthor extends Story {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
}

export interface StoryGroup {
  profile: Pick<Profile, 'id' | 'username' | 'avatar_url'>;
  stories: StoryWithAuthor[];
}

export function useStories() {
  const { session } = useAuth();
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('stories')
      .select('*, profiles!stories_user_id_fkey(id, username, avatar_url)')
      .order('created_at', { ascending: true });

    const rows = ((data ?? []) as unknown) as StoryWithAuthor[];

    // One avatar per user (not per photo): group consecutively so the
    // viewer naturally advances through one person's stories before
    // moving to the next, most-recently-active user first.
    const byUser = new Map<string, StoryWithAuthor[]>();
    for (const row of rows) {
      const list = byUser.get(row.user_id) ?? [];
      list.push(row);
      byUser.set(row.user_id, list);
    }
    const sortedGroups = Array.from(byUser.values()).sort(
      (a, b) => new Date(b[b.length - 1].created_at).getTime() - new Date(a[a.length - 1].created_at).getTime()
    );

    setStories(sortedGroups.flat());
    setGroups(sortedGroups.map((g) => ({ profile: g[0].profiles, stories: g })));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const createStory = async (input: { media_url: string; location?: string }) => {
    if (!session) return { error: 'not signed in' };
    const { error } = await supabase.from('stories').insert({
      user_id: session.user.id,
      media_url: input.media_url,
      location: input.location ?? null,
    });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const deleteStory = async (storyId: string) => {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  return { stories, groups, loading, refresh: load, createStory, deleteStory };
}
