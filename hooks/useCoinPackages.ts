import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { CoinPackage } from '@/lib/database.types';

export function useCoinPackages() {
  const [packages, setPackages] = useState<CoinPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from('coin_packages')
      .select('*')
      .eq('active', true)
      .order('sort_order', { ascending: true });

    setError(loadError?.message ?? null);
    setPackages((data as CoinPackage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /**
   * Hands off to Stripe's hosted checkout. The coins are credited by the
   * webhook once the payment clears, never here - a client that never comes
   * back from Stripe must not be able to skip paying.
   */
  const buyPackage = async (packageKey: string): Promise<{ error: string | null }> => {
    const { data, error: invokeError } = await supabase.functions.invoke('stripe-coins-checkout', {
      body: { packageKey },
    });
    if (invokeError) return { error: invokeError.message };
    if (!data?.url) return { error: data?.error ?? 'Keine Checkout-URL erhalten' };

    if (Platform.OS === 'web') window.location.href = data.url;
    else await Linking.openURL(data.url);
    return { error: null };
  };

  return { packages, loading, error, refresh: load, buyPackage };
}
