-- Add refund + cancellation tracking columns to subscriptions table
-- Add 'refunded' to subscription_status_enum
-- Run in Supabase Dashboard → SQL Editor

-- 1. Extend the enum with the new value
alter type public.subscription_status_enum add value if not exists 'refunded';

-- 2. Add tracking columns
alter table public.subscriptions
  add column if not exists refunded_at       timestamptz,
  add column if not exists refunded_amount   numeric(10,2),
  add column if not exists cancelled_at      timestamptz;

-- Allow admins to update the new columns (service role already bypasses RLS)
-- Users should not be able to update refund fields, so no user policy needed
