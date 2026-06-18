-- Release notes table
-- Each row represents an app release with a list of changes shown to users as "What's New"

create table if not exists public.releases (
  id            uuid         primary key default gen_random_uuid(),
  build_number  integer      unique,          -- null for web-only releases
  version       text,                         -- null for web-only releases
  title         text,
  changes       jsonb        not null default '[]', -- [{category: 'New'|'Fix'|'Improvement', text: string}]
  platforms     text[]       not null default '{}', -- e.g. {'iOS App','Android App','Web'}
  is_published  boolean      not null default false,
  published_at  timestamptz,
  created_at    timestamptz  not null default now()
);

-- If running after initial table creation, add the platforms column and make columns nullable:
alter table public.releases add column if not exists platforms text[] not null default '{}';
alter table public.releases alter column build_number drop not null;
alter table public.releases alter column version drop not null;
alter table public.releases add column if not exists sort_order integer not null default 0;

alter table public.releases enable row level security;

create policy "Anyone can read published releases"
  on public.releases for select
  using (is_published = true);
