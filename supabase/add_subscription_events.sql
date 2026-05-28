-- Subscription events log — system-level events from Stripe webhooks + admin actions
-- No admin_id required (events can be triggered by the system, not just admins)
-- Run in Supabase Dashboard → SQL Editor

create table if not exists public.subscription_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  sub_id      uuid references public.subscriptions(id) on delete set null,
  event       text not null,
  -- Events: subscribed | resubscribed_after_refund | cancelled | cancelled_immediately
  --         overdue | refunded | subscription_deleted
  metadata    jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists subscription_events_user_id_idx on public.subscription_events(user_id);
create index if not exists subscription_events_created_at_idx on public.subscription_events(created_at desc);

alter table public.subscription_events enable row level security;

create policy "Admins can read subscription events"
  on public.subscription_events for select
  using (is_admin());

create policy "Service role can insert subscription events"
  on public.subscription_events for insert
  with check (true);
