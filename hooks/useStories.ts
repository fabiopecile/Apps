import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Ad, Profile, Story } from '@/lib/database.types';

export interface StoryWithAuthor extends Story {
  profiles: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
  /** Set on synthetic entries that are a sponsored story, not a real one. */
  ad?: Ad;
}

export interface StoryGroup {
  profile: Pick<Profile, 'id' | 'username' | 'avatar_url' | 'equipped_frame_color'>;
  stories: StoryWithAuthor[];
}

/**
 * Turns an ad into something the story viewer can page through like any other
 * story. It never touches the stories table - the id is prefixed so nothing
 * downstream mistakes it for a real row and tries to delete it.
 */
export function adAsStory(ad: Ad): StoryWithAuthor {
  return {
    id: `ad-${ad.id}`,
    user_id: '',
    media_url: ad.image_url,
    media_aspect_ratio: ad.image_aspect_ratio,
    location: null,
    is_highlight: false,
    created_at: ad.created_at,
    expires_at: ad.ends_at ?? new Date(Date.now() + 86_400_000).toISOString(),
    profiles: {
      id: '',
      username: ad.advertiser_name,
      avatar_url: ad.advertiser_avatar_url,
      equipped_frame_color: null,
    },
    ad,
  };
}

export function useStories() {
  const { session } = useAuth();
  const [stories, setStories] = useState<StoryWithAuthor[]>([]);
  const [groups, setGroups] = useState<StoryGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('stories')
      .select('*, profiles!stories_user_id_fkey(id, username, avatar_url, equipped_frame_color)')
      .order('created_at', { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }
    setError(null);

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

  const createStory = async (input: { media_url: string; location?: string; media_aspect_ratio?: number }) => {
    if (!session) return { error: 'not signed in' };
    const { error } = await supabase.from('stories').insert({
      user_id: session.user.id,
      media_url: input.media_url,
      location: input.location ?? null,
      media_aspect_ratio: input.media_aspect_ratio ?? null,
    });
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const deleteStory = async (storyId: string) => {
    const { error } = await supabase.from('stories').delete().eq('id', storyId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  const saveHighlight = async (storyId: string) => {
    const farFuture = new Date();
    farFuture.setFullYear(farFuture.getFullYear() + 100);
    const { error } = await supabase
      .from('stories')
      .update({ is_highlight: true, expires_at: farFuture.toISOString() })
      .eq('id', storyId);
    if (!error) await load();
    return { error: error?.message ?? null };
  };

  return { stories, groups, loading, error, refresh: load, createStory, deleteStory, saveHighlight };
}
