alter table public.jumps
  add column if not exists aad_fired        boolean not null default false,
  add column if not exists reserve_deployed boolean not null default false;
