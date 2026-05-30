-- Enforce one owner per push token at the DB level.
-- A device token belongs to exactly one user at a time.
-- The app already nulls out stale owners before claiming, so conflicts shouldn't
-- occur in practice — this is a safety net.
create unique index if not exists notification_preferences_push_token_unique
  on public.notification_preferences (push_token)
  where push_token is not null;
