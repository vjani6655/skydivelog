-- Add next_repack_date to gear table
-- Replaces the last_repack_date + calculated interval pattern.
-- next_repack_date stores when the reserve canopy is next due for repack.

alter table public.gear
  add column if not exists next_repack_date date;
