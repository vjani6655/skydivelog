alter table public.jumps
  add column if not exists planned_objectives text,
  add column if not exists planned_manoeuvres text;
