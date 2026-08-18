// Supabase Edge Function: lets an admin send a custom push notification to
// all users or a single user. The caller's JWT is verified by the Supabase
// gateway (this function is deployed WITH JWT verification, unlike the other
// functions in this project), and we additionally check profiles.is_admin
// server-side before sending anything - the client-side admin screen is only
// a convenience, not the actual access control.
//
// Deploy: supabase functions deploy admin-send-notification
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

async function sendPushMessages(messages: { to: string; title: string; body: string }[]) {
  let sent = 0;
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk.map((m) => ({ ...m, sound: 'default' }))),
    });
    sent += chunk.length;
  }
  return sent;
}

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const jwt = (req.headers.get('Authorization') ?? '').replace('Bearer ', '');
  if (!jwt) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data: callerProfile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', userData.user.id)
    .single();

  if (!callerProfile?.is_admin) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { title, body, target_user_id } = await req.json().catch(() => ({}));
  if (!title || !body) {
    return new Response(JSON.stringify({ error: 'Missing title/body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let query = supabase.from('profiles').select('push_token').not('push_token', 'is', null);
  if (target_user_id) query = query.eq('id', target_user_id);

  const { data: recipients } = await query;
  const messages = (recipients ?? [])
    .map((r: { push_token: string | null }) => r.push_token)
    .filter((token): token is string => Boolean(token))
    .map((to) => ({ to, title: String(title), body: String(body) }));

  const sent = await sendPushMessages(messages);

  return new Response(JSON.stringify({ ok: true, sent }), { headers: { 'Content-Type': 'application/json' } });
});
