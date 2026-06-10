-- Stores freefall time (in seconds) accumulated before the user started logging in the app.
-- Used to show a true career total on the profile page.
alter table public.users
  add column if not exists prior_freefall_seconds integer not null default 0;
