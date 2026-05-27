-- ============================================================
-- App Media Table
-- Run in Supabase SQL Editor to enable admin-uploaded hero images
-- ============================================================

-- Table to store media slots used throughout the app and website
create table if not exists public.app_media (
  id          uuid        primary key default gen_random_uuid(),
  slot        text        not null unique,   -- e.g. 'welcome_hero', 'marketing_app_banner'
  label       text        not null,          -- human-readable name shown in admin panel
  description text,                          -- hint about where this appears
  url         text,                          -- public URL of the uploaded image (null = no image yet)
  updated_at  timestamptz not null default now()
);

-- Seed the known slots (upsert so re-runs are safe)
insert into public.app_media (slot, label, description) values
  ('welcome_hero',           'App welcome hero',         'Top half of the welcome screen in the mobile app (create account / sign in)'),
  ('marketing_app_banner',   'Marketing app banner',     'The "The App" image banner on the marketing homepage'),
  ('features_illustration',  'Features — default image', 'Fallback illustration used for any feature section without its own image'),
  ('features_logbook',       'Features — Logbook',       'Illustration for the Logbook feature section'),
  ('features_currency',      'Features — Currency',      'Illustration for the Currency / stats feature section'),
  ('features_gear',          'Features — Gear',          'Illustration for the Gear & repacks feature section'),
  ('features_certificates',  'Features — Certificates',  'Illustration for the Certificates feature section'),
  ('features_export',        'Features — Export',        'Illustration for the Export feature section')
on conflict (slot) do nothing;

-- Row-level security: public can read, only service role can write
alter table public.app_media enable row level security;

create policy "app_media_public_read"
  on public.app_media for select
  using (true);

-- Storage bucket for uploaded media (run this via Supabase dashboard Storage tab
-- or uncomment the insert below if using service-role migration)
-- insert into storage.buckets (id, name, public) values ('app-media', 'app-media', true)
-- on conflict (id) do nothing;
