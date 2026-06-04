-- Voice log feature flag.
-- Global toggle: app_config.voice_log_enabled (default true = on for everyone)
-- Per-user override: users.voice_log_enabled (NULL = inherit global, true/false = override)

-- 1. Global flag on the singleton app_config row
ALTER TABLE public.app_config
  ADD COLUMN IF NOT EXISTS voice_log_enabled boolean NOT NULL DEFAULT true;

-- 2. Per-user override (NULL means "follow the global setting")
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS voice_log_enabled boolean;

-- Note: RLS on app_config already allows public read; writes are service-role only.
-- RLS on users already allows each user to read their own row.
