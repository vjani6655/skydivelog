-- Add segment_key column to store built-in segment strings ('all', 'active', 'trial', 'overdue', 'specific')
-- Previously only segment_id (UUID FK) was stored, causing built-in segments to show as "All users" in history.
alter table public.announcements
  add column if not exists segment_key text;
