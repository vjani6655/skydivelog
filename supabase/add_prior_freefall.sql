-- Stores freefall and canopy time (in seconds) accumulated before the user started logging in the app.
-- Used to show true career totals on the profile and stats pages.
alter table public.users
  add column if not exists prior_freefall_seconds integer not null default 0;

alter table public.users
  add column if not exists prior_canopy_seconds integer not null default 0;
