-- Allow ticket_messages to be inserted without a sender_id
-- This is needed for inbound email replies from anonymous / non-user-linked tickets.
-- Run in Supabase Dashboard → SQL Editor

alter table public.ticket_messages
  alter column sender_id drop not null;
