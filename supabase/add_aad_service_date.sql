-- AAD next service date: tracks when the AAD unit is due for its next service.

alter table public.gear
  add column if not exists next_service_date date;
