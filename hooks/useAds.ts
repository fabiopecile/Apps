import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import type { Ad, AdPlacement } from '@/lib/database.types';
import { hasPro } from '@/lib/pro';

type Slot = Exclude<AdPlacement, 'both'>;

/**
 * Ads for one placement. Pro subscribers get an empty list and no request at
 * all - "keine Werbung" is what they are paying for, so it must not depend on
 * the UI remembering to hide something it fetched anyway.
 */
export function useAds(slot: Slot) {
  const { profile, session } = useAuth();
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // One impression per ad per screen visit, not one per re-render.
  const counted = useRef<Set<string>>(new Set());

  const isPro = hasPro(profile);

  const load = useCallback(async () => {
    if (isPro || !session) {
      setAds([]);
      setLoading(false);
      return;
    }

    const { data, error: loadError } = await supabase
      .from('ads')
      .select('*')
      // An admin can read inactive ads too (their own policy is permissive and
      // ORs with the public one), so a paused ad would otherwise still show up
      // in their own feed.
      .eq('active', true)
      .in('placement', [slot, 'both'])
      .order('priority', { ascending: false })
      .limit(10);

    // Swallowing this made a missing table or a policy problem look exactly
    // like "no ads booked" - which is the one thing you cannot debug.
    setError(loadError?.message ?? null);
    setAds((data as Ad[]) ?? []);
    setLoading(false);
  }, [isPro, session, slot]);

  useEffect(() => {
    load();
  }, [load]);

  const trackImpression = useCallback(
    (adId: string) => {
      if (isPro || counted.current.has(adId)) return;
      counted.current.add(adId);
      supabase
        .rpc('log_ad_event', { p_ad_id: adId, p_event_type: 'impression', p_placement: slot })
        .then(() => {});
    },
    [isPro, slot]
  );

  const openAd = useCallback(
    async (ad: Ad) => {
      // Count the tap before leaving - once the browser takes over the app may
      // not get another turn.
      await supabase.rpc('log_ad_event', { p_ad_id: ad.id, p_event_type: 'click', p_placement: slot });

      // A target starting with "/" is a screen in this app, not a website.
      // Own promotions ("Pro werden", "Zum Shop") should jump straight there
      // instead of kicking the user out into a browser and back.
      if (ad.target_url.startsWith('/')) {
        router.push(ad.target_url as never);
        return;
      }

      const supported = await Linking.canOpenURL(ad.target_url);
      if (supported) await Linking.openURL(ad.target_url);
    },
    [slot]
  );

  return { ads, loading, error, isPro, refresh: load, trackImpression, openAd };
}

/**
 * Mixes ads into a list of content at a fixed interval, the way Instagram
 * drops a sponsored post between organic ones. Returns a tagged union so the
 * list renderer can branch without guessing.
 */
export function interleaveAds<T>(
  items: T[],
  ads: Ad[],
  everyN: number
): ({ kind: 'item'; item: T } | { kind: 'ad'; ad: Ad })[] {
  if (ads.length === 0) return items.map((item) => ({ kind: 'item' as const, item }));

  const result: ({ kind: 'item'; item: T } | { kind: 'ad'; ad: Ad })[] = [];
  let adIndex = 0;

  items.forEach((item, i) => {
    result.push({ kind: 'item', item });
    // Never trail an ad after the last item - it would sit alone at the end of
    // the scroll with nothing under it.
    const isLast = i === items.length - 1;
    if (!isLast && (i + 1) % everyN === 0) {
      result.push({ kind: 'ad', ad: ads[adIndex % ads.length] });
      adIndex += 1;
    }
  });

  return result;
}
