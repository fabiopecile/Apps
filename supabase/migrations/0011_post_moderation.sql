-- KI-Moderation: nach jedem neuen Beitrag wird eine Edge Function
-- (moderate-post) aufgerufen, die per Claude Vision prüft, ob der Beitrag
-- einen Fußballbezug hat. Falls nicht, löscht die Function den Beitrag und
-- zieht die dafür vergebenen XP wieder ab.
--
-- Die Function-URL und ein selbst gewähltes Webhook-Secret werden bewusst
-- NICHT in dieser (eingecheckten) Migration hinterlegt, sondern per SQL
-- Editor in app_settings eingetragen - siehe Anleitung im Chat.

create table public.app_settings (
  key text primary key,
  value text not null
);

alter table public.app_settings enable row level security;
-- Bewusst keine Policies: nur der Postgres-Owner (und SECURITY DEFINER
-- Funktionen wie unten) kann diese Tabelle lesen/schreiben, kein Client.

create or replace function public.trigger_moderate_post()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn_url text;
  webhook_secret text;
begin
  select value into fn_url from public.app_settings where key = 'moderation_function_url';
  select value into webhook_secret from public.app_settings where key = 'moderation_webhook_secret';

  if fn_url is null or webhook_secret is null then
    return new; -- noch nicht konfiguriert, überspringen
  end if;

  perform net.http_post(
    url := fn_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', webhook_secret),
    body := jsonb_build_object('post_id', new.id)
  );

  return new;
end;
$$;

create trigger posts_moderate_after_insert
  after insert on public.posts
  for each row
  execute function public.trigger_moderate_post();
