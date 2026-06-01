-- Auto-flagging trigger for suspicious jump entries and unauthorized logging
-- Run once in Supabase SQL editor or as a migration.
-- Inserts rows into flagged_entries with source='algorithm'.

-- ─── Flag function ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION flag_suspicious_jump()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_max_jump_number INTEGER;
  v_sub_status      TEXT;
  v_renews_at       TIMESTAMPTZ;
BEGIN
  -- ── 1. Impossible freefall (> 120 s is physically impossible) ──────────────
  IF NEW.freefall_seconds IS NOT NULL AND NEW.freefall_seconds > 120 THEN
    INSERT INTO flagged_entries (jump_id, reason, detail, source, severity)
    VALUES (
      NEW.id,
      'Impossible freefall duration',
      format('freefall_seconds = %s (max physically possible ≈ 120 s)', NEW.freefall_seconds),
      'algorithm',
      'high'
    );
  END IF;

  -- ── 2. Implausible exit altitude ─────────────────────────────────────────
  IF NEW.exit_altitude_ft IS NOT NULL AND (
    NEW.exit_altitude_ft > 30000
    OR (NEW.freefall_seconds IS NOT NULL AND NEW.freefall_seconds > 0 AND NEW.exit_altitude_ft < 1000)
  ) THEN
    INSERT INTO flagged_entries (jump_id, reason, detail, source, severity)
    VALUES (
      NEW.id,
      'Implausible exit altitude',
      format(
        'exit_altitude_ft = %s, freefall_seconds = %s',
        NEW.exit_altitude_ft,
        NEW.freefall_seconds
      ),
      'algorithm',
      'mid'
    );
  END IF;

  -- ── 3. Jump number regression (back-filling or tampering) ────────────────
  SELECT MAX(jump_number)
    INTO v_max_jump_number
    FROM jumps
   WHERE user_id = NEW.user_id
     AND id != NEW.id
     AND deleted_at IS NULL;

  IF v_max_jump_number IS NOT NULL AND NEW.jump_number < v_max_jump_number THEN
    INSERT INTO flagged_entries (jump_id, reason, detail, source, severity)
    VALUES (
      NEW.id,
      'Jump number regression',
      format(
        'Logged jump_number = %s, but user already has a jump numbered %s',
        NEW.jump_number,
        v_max_jump_number
      ),
      'algorithm',
      'mid'
    );
  END IF;

  -- ── 4. Unauthorized logging (subscription not active / past grace period) ─
  SELECT status, renews_at
    INTO v_sub_status, v_renews_at
    FROM subscriptions
   WHERE user_id = NEW.user_id
   ORDER BY renews_at DESC NULLS LAST
   LIMIT 1;

  IF v_sub_status IN ('overdue', 'cancelled') AND (v_renews_at IS NULL OR v_renews_at < NOW()) THEN
    INSERT INTO flagged_entries (jump_id, reason, detail, source, severity)
    VALUES (
      NEW.id,
      'Unauthorized logging — subscription not active',
      format(
        'User %s logged a jump with subscription status = ''%s'' and renews_at = %s',
        NEW.user_id,
        v_sub_status,
        COALESCE(v_renews_at::TEXT, 'NULL')
      ),
      'algorithm',
      'high'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- ─── Trigger ──────────────────────────────────────────────────────────────────

DROP TRIGGER IF EXISTS trg_flag_suspicious_jump ON jumps;

CREATE TRIGGER trg_flag_suspicious_jump
  AFTER INSERT ON jumps
  FOR EACH ROW
  EXECUTE FUNCTION flag_suspicious_jump();
