-- Adds a column to notification_preferences to persist which announcement
-- banners a user has dismissed. This allows dismissals to sync across devices.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS dismissed_announcement_ids uuid[] NOT NULL DEFAULT '{}';
