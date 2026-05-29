-- Edit log: records field-level changes when gear or certificates are edited.

create table if not exists public.edit_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users (id) on delete cascade,
  item_type   text not null check (item_type in ('gear', 'certificate')),
  item_id     uuid not null,
  changed_at  timestamptz not null default now(),
  changes     jsonb not null  -- array of {field, from, to}
);

alter table public.edit_log enable row level security;

create policy "Users can manage own edit logs"
  on public.edit_log for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index if not exists edit_log_item_idx
  on public.edit_log (item_id, changed_at desc);
