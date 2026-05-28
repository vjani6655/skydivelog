-- Fix support_tickets to accept contact form submissions (anonymous + logged-in)
-- Run in Supabase Dashboard → SQL Editor

-- 1. Make user_id nullable (contact form may be anonymous)
alter table public.support_tickets
  alter column user_id drop not null;

-- 2. Add columns for contact form data
alter table public.support_tickets
  add column if not exists name        text,
  add column if not exists email       text,
  add column if not exists message     text,
  add column if not exists source      text default 'web';

-- 3. Add 'press' to category enum
alter type public.support_ticket_category_enum add value if not exists 'press';

-- 4. Allow anonymous (unauthenticated) inserts so the public contact form works
drop policy if exists "Anyone can submit a support ticket" on public.support_tickets;
create policy "Anyone can submit a support ticket"
  on public.support_tickets for insert
  with check (true);

-- 5. Allow anonymous users to read nothing (existing user policy covers logged-in)
-- No extra policy needed — existing policies remain.
