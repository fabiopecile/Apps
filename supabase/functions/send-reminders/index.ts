// Supabase Edge Function: sends push reminders via the Expo push API.
//   ?task=tips  -> "Du hast diese Runde noch nicht getippt" (matchdays whose
//                  deadline is coming up soon, users with zero tips for it)
//   ?task=wheel -> "Vergiss nicht am täglichen Glücksrad zu drehen" (users who
//                  haven't spun today)
//   ?task=all (default) -> both
//
// Deploy: supabase functions deploy send-reminders --no-verify-jwt
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically by
// the Edge Functions runtime.
//
// Schedule via Supabase Dashboard -> Database -> Cron Jobs (or cron.schedule),
// e.g. hourly for ?task=tips and once daily (evening) for ?task=wheel.

import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TIP_REMINDER_WINDOW_HOURS = 20;

async function sendPushMessages(messages: { to: string; title: string; body: string }[]) {
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(chunk.map((m) => ({ ...m, sound: 'default' }))),
    });
  }
}

async function sendTipReminders(supabase: SupabaseClient) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TIP_REMINDER_WINDOW_HOURS * 60 * 60 * 1000);

  const { data: matchdays } = await supabase
    .from('matchdays')
    .select('id, deadline')
    .gt('deadline', now.toISOString())
    .lt('deadline', windowEnd.toISOString());

  let sent = 0;
  for (const matchday of matchdays ?? []) {
    const { data: matches } = await supabase.from('matches').select('id').eq('matchday_id', matchday.id);
    const matchIds = (matches ?? []).map((m: { id: string }) => m.id);
    if (matchIds.length === 0) continue;

    const { data: candidates } = await supabase
      .from('profiles')
      .select('id, push_token')
      .not('push_token', 'is', null)
      .eq('notifications_enabled', true);

    for (const user of candidates ?? []) {
      const { count } = await supabase
        .from('tips')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .in('match_id', matchIds);
      if ((count ?? 0) > 0) continue;

      const { error: logError } = await supabase
        .from('notification_log')
        .insert({ user_id: user.id, type: 'tip_reminder', ref_key: matchday.id });
      if (logError) continue; // already reminded for this matchday

      await sendPushMessages([
        { to: user.push_token as string, title: 'TeamUp11', body: 'Du hast diese Runde noch nicht getippt ⚽️' },
      ]);
      sent++;
    }
  }
  return sent;
}

async function sendWheelReminders(supabase: SupabaseClient) {
  const today = new Date().toISOString().slice(0, 10);

  const { data: candidates } = await supabase
    .from('profiles')
    .select('id, push_token')
    .not('push_token', 'is', null)
    .eq('notifications_enabled', true)
    .or(`last_wheel_spin_date.is.null,last_wheel_spin_date.lt.${today}`);

  let sent = 0;
  for (const user of candidates ?? []) {
    const { error: logError } = await supabase
      .from('notification_log')
      .insert({ user_id: user.id, type: 'wheel_reminder', ref_key: today });
    if (logError) continue; // already reminded today

    await sendPushMessages([
      { to: user.push_token as string, title: 'TeamUp11', body: 'Vergiss nicht, heute am Glücksrad zu drehen 🎁' },
    ]);
    sent++;
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

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const task = new URL(req.url).searchParams.get('task') ?? 'all';
  const results: Record<string, number> = {};

  try {
    if (task === 'all' || task === 'tips') results.tipReminders = await sendTipReminders(supabase);
    if (task === 'all' || task === 'wheel') results.wheelReminders = await sendWheelReminders(supabase);
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ ok: true, results }), { headers: { 'Content-Type': 'application/json' } });
});
