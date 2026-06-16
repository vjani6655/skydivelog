-- ─────────────────────────────────────────────────────────────────────────────
-- IAP support: make Stripe-specific columns nullable so Apple IAP rows
-- can be inserted without Stripe data, and add Apple-specific columns.
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Drop NOT NULL constraints from Stripe-specific columns
ALTER TABLE public.subscriptions
  ALTER COLUMN stripe_subscription_id DROP NOT NULL,
  ALTER COLUMN stripe_customer_id     DROP NOT NULL,
  ALTER COLUMN payment_method_brand   DROP NOT NULL,
  ALTER COLUMN payment_method_last4   DROP NOT NULL,
  ALTER COLUMN payment_method_expiry  DROP NOT NULL,
  ALTER COLUMN price_at_signup        DROP NOT NULL;

-- 2. Add Apple IAP columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS apple_original_transaction_id text,
  ADD COLUMN IF NOT EXISTS apple_product_id              text,
  ADD COLUMN IF NOT EXISTS source                        text NOT NULL DEFAULT 'stripe';

-- 3. Unique index: one row per Apple original transaction (ignores NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_apple_original_tx_idx
  ON public.subscriptions (apple_original_transaction_id)
  WHERE apple_original_transaction_id IS NOT NULL;
