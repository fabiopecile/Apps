// Supabase Edge Function: checks a newly created post for football
// relevance using Claude vision, and removes it (deducting the XP it
// earned) if it isn't football-related.
//
// Deploy: supabase functions deploy moderate-post --no-verify-jwt
// Requires the secrets ANTHROPIC_API_KEY and MODERATION_WEBHOOK_SECRET
// (supabase secrets set ...). SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are
// provided automatically by the Edge Functions runtime.
//
// Triggered automatically after every new post insert - see migration 0011
// (the posts_moderate_after_insert trigger) and the app_settings row that
// points it at this function's URL + a shared webhook secret.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';
const XP_PER_POST = 50;

async function isFootballRelated(imageUrl: string | null, caption: string | null, apiKey: string) {
  const content: Record<string, unknown>[] = [];

  if (imageUrl) {
    const imgRes = await fetch(imageUrl);
    if (imgRes.ok) {
      const buffer = new Uint8Array(await imgRes.arrayBuffer());
      let binary = '';
      for (const byte of buffer) binary += String.fromCharCode(byte);
      const base64 = btoa(binary);
      const mediaType = imgRes.headers.get('content-type') ?? 'image/jpeg';
      content.push({ type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } });
    }
  }

  content.push({
    type: 'text',
    text: `Bildunterschrift: "${caption ?? ''}"\n\nHat dieser Beitrag (Foto und/oder Text) einen erkennbaren Bezug zu Fußball (z. B. Spiel, Stadion, Trikot, Fußballfans, Public Viewing, Fußballausrüstung, Spielergebnis)? Antworte ausschließlich mit "ja" oder "nein".`,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 10,
      messages: [{ role: 'user', content }],
    }),
  });

  if (!res.ok) throw new Error(`Anthropic API ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const answer: string = (data.content?.[0]?.text ?? '').trim().toLowerCase();
  return answer.startsWith('ja');
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
  const webhookSecret = Deno.env.get('MODERATION_WEBHOOK_SECRET');

  if (!supabaseUrl || !serviceRoleKey || !anthropicKey || !webhookSecret) {
    return new Response(JSON.stringify({ error: 'Missing required secrets' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.headers.get('x-webhook-secret') !== webhookSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { post_id } = await req.json().catch(() => ({ post_id: null }));
  if (!post_id) {
    return new Response(JSON.stringify({ error: 'Missing post_id' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('id, user_id, caption, image_url')
    .eq('id', post_id)
    .maybeSingle();

  if (postError || !post) {
    return new Response(JSON.stringify({ ok: true, skipped: 'post not found (already deleted?)' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let related: boolean;
  try {
    related = await isFootballRelated(post.image_url, post.caption, anthropicKey);
  } catch (err) {
    // If the check itself fails, don't punish the user for our own error.
    return new Response(JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (related) {
    return new Response(JSON.stringify({ ok: true, related: true }), { headers: { 'Content-Type': 'application/json' } });
  }

  await supabase.from('posts').delete().eq('id', post.id);

  const { data: profile } = await supabase.from('profiles').select('xp').eq('id', post.user_id).single();
  if (profile) {
    const newXp = Math.max(0, profile.xp - XP_PER_POST);
    await supabase
      .from('profiles')
      .update({ xp: newXp, level: Math.floor(newXp / 1000) + 1 })
      .eq('id', post.user_id);
  }

  return new Response(JSON.stringify({ ok: true, related: false, deleted: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
