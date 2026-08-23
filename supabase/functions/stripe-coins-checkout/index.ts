// Supabase Edge Function: creates a one-off Stripe Checkout session (payment
// mode, not subscription) for a coin package.
//
// The price is built inline from the coin_packages row via price_data, so
// there is nothing to create in the Stripe Dashboard for each package -
// changing a price means changing the database row, not Stripe.
//
// The package key is never trusted from the client for the amount: the client
// sends a key, the price and coin count are read from the database here, and
// the actual crediting happens in the webhook.
//
// Deploy: supabase functions deploy stripe-coins-checkout
// (JWT verification ON - the caller must be signed in)
// Requires secrets: STRIPE_SECRET_KEY, APP_URL

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

async function stripeRequest(path: string, secretKey: string, body: Record<string, string>) {
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body).toString(),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? `Stripe API ${res.status}`);
  return data;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
  const appUrl = Deno.env.get('APP_URL');

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !appUrl) {
    return json({ error: 'Missing required secrets' }, 500);
  }

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return json({ error: 'Unauthorized' }, 401);

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) return json({ error: 'Unauthorized' }, 401);

  let packageKey: string | undefined;
  try {
    const body = await req.json();
    packageKey = body?.packageKey;
  } catch {
    return json({ error: 'Kein Paket angegeben' }, 400);
  }
  if (!packageKey) return json({ error: 'Kein Paket angegeben' }, 400);

  const { data: pkg } = await supabase
    .from('coin_packages')
    .select('key, coins, bonus_coins, price_cents, currency, label, active')
    .eq('key', packageKey)
    .single();

  if (!pkg || !pkg.active) return json({ error: 'Paket nicht verfügbar' }, 400);

  const totalCoins = pkg.coins + pkg.bonus_coins;

  try {
    let customerId: string | undefined;
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userData.user.id)
      .single();

    customerId = profile?.stripe_customer_id ?? undefined;
    if (!customerId) {
      const customer = await stripeRequest('/customers', stripeSecretKey, {
        email: userData.user.email ?? '',
        'metadata[user_id]': userData.user.id,
      });
      customerId = customer.id;
      await supabase.from('profiles').update({ stripe_customer_id: customerId }).eq('id', userData.user.id);
    }

    const session = await stripeRequest('/checkout/sessions', stripeSecretKey, {
      mode: 'payment',
      customer: customerId!,
      'line_items[0][price_data][currency]': pkg.currency,
      'line_items[0][price_data][unit_amount]': String(pkg.price_cents),
      'line_items[0][price_data][product_data][name]': `${totalCoins.toLocaleString('de-AT')} Coins`,
      'line_items[0][price_data][product_data][description]': pkg.label,
      'line_items[0][quantity]': '1',
      success_url: `${appUrl}?coins=success`,
      cancel_url: `${appUrl}?coins=cancelled`,
      client_reference_id: userData.user.id,
      // The webhook reads these back - it must not trust anything the client
      // sends at that point.
      'metadata[kind]': 'coins',
      'metadata[user_id]': userData.user.id,
      'metadata[package_key]': pkg.key,
    });

    return json({ url: session.url });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
