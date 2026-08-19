import { Linking, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';

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
