-- App configuration table (singleton row).
-- Used for real-time config pushed to mobile clients, including force-upgrade gating.

CREATE TABLE IF NOT EXISTS public.app_config (
  id                      text PRIMARY KEY DEFAULT 'singleton',
  force_upgrade_enabled   boolean     NOT NULL DEFAULT false,
  minimum_version         text        NOT NULL DEFAULT '0.0.0.0',
  upgrade_title           text        NOT NULL DEFAULT 'Update Required',
  upgrade_message         text        NOT NULL DEFAULT 'A new version of Jump Logs is available. Please update to continue.',
  ios_store_url           text,
  android_store_url       text,
  updated_at              timestamptz NOT NULL DEFAULT now(),
  updated_by_email        text
);

-- Insert the singleton row if it doesn't exist
INSERT INTO public.app_config (id)
VALUES ('singleton')
ON CONFLICT (id) DO NOTHING;

-- RLS: anyone can read (needed for anonymous + authenticated mobile clients)
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public read app_config" ON public.app_config;
CREATE POLICY "Public read app_config"
  ON public.app_config FOR SELECT
  USING (true);

-- Writes only via service role (admin API uses service key, bypasses RLS)

-- Enable Supabase Realtime so mobile clients get instant push on UPDATE
ALTER PUBLICATION supabase_realtime ADD TABLE public.app_config;
