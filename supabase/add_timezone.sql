-- Add timezone preference column to users table.
-- This stores the user's preferred IANA timezone string (e.g. 'Australia/Sydney').
-- NULL means not configured — the app falls back to UTC display with a "(UTC)" label.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS timezone text;
