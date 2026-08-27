import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/lib/database.types';

/**
 * Whether this profile has Pro right now, from either source: a paying Stripe
 * subscription (is_pro) or a grant that has not run out yet (pro_until).
 * Every gate in the app goes through here so the two can never drift.
 */
export function hasPro(profile: Pick<Profile, 'is_pro' | 'pro_until'> | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_pro) return true;
  return !!profile.pro_until && new Date(profile.pro_until) > new Date();
}

async function openStripeUrl(functionName: 'stripe-checkout' | 'stripe-portal'): Promise<{ error: string | null }> {
  const { data, error } = await supabase.functions.invoke(functionName);
  if (error) return { error: error.message };
  if (!data?.url) return { error: 'Keine Checkout-URL erhalten' };

  if (Platform.OS === 'web') {
    window.location.href = data.url;
  } else {
    await Linking.openURL(data.url);
  }
  return { error: null };
}

export const startProCheckout = () => openStripeUrl('stripe-checkout');
export const openProBillingPortal = () => openStripeUrl('stripe-portal');
