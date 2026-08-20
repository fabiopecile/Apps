// Shared CORS headers for every Edge Function the client calls directly via
// supabase.functions.invoke() from the web preview (Stripe/cron-triggered
// functions like stripe-webhook or send-reminders don't need this - the
// browser never talks to them, so there's no CORS preflight to satisfy).
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
