-- Pro subscription core: a flag driven by Stripe webhooks (see the
-- stripe-checkout / stripe-webhook / stripe-portal Edge Functions), plus a
-- Pro-only setting (custom daily reminder hour instead of the fixed default).

alter table public.profiles
  add column is_pro boolean not null default false,
  add column stripe_customer_id text,
  add column stripe_subscription_id text,
  add column reminder_hour_utc int;

create unique index profiles_stripe_customer_id_key on public.profiles (stripe_customer_id) where stripe_customer_id is not null;
