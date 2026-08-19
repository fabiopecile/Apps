// Supabase Edge Function: Stripe webhook. This is what actually flips
// profiles.is_pro - never trust the client for that. Verifies Stripe's
// signature manually (no Stripe SDK, to avoid Deno/esm.sh compatibility
// issues - this project's other functions are dependency-free too).
//
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// (Stripe can't send a Supabase JWT - the signature check below is the
// actual authentication for this endpoint)
// Requires secrets: STRIPE_WEBHOOK_SECRET, SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY (the latter two are provided automatically).
//
// After deploying, add the endpoint URL in the Stripe Dashboard -> Developers
// -> Webhooks, listening for: checkout.session.completed,
// customer.subscription.updated, customer.subscription.deleted.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

async function verifyStripeSignature(payload: string, sigHeader: string, secret: string): Promise<boolean> {
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => p.split('=') as [string, string]));
  const timestamp = parts['t'];
  const signature = parts['v1'];
  if (!timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${timestamp}.${payload}`));
  const expected = Array.from(new Uint8Array(sigBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return expected === signature;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return new Response('Missing required secrets', { status: 500 });
  }

  const payload = await req.text();
  const sigHeader = req.headers.get('stripe-signature') ?? '';
  const valid = await verifyStripeSignature(payload, sigHeader, webhookSecret);
  if (!valid) return new Response('Invalid signature', { status: 400 });

  const event = JSON.parse(payload);
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const userId = session.client_reference_id;
    if (userId) {
      await supabase
        .from('profiles')
        .update({
          is_pro: true,
          stripe_customer_id: session.customer,
          stripe_subscription_id: session.subscription,
        })
        .eq('id', userId);
    }
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object;
    const isActive = event.type === 'customer.subscription.updated' && ['active', 'trialing'].includes(subscription.status);
    await supabase
      .from('profiles')
      .update({ is_pro: isActive, stripe_subscription_id: subscription.id })
      .eq('stripe_customer_id', subscription.customer);
  }

  return new Response(JSON.stringify({ received: true }), { headers: { 'Content-Type': 'application/json' } });
});
