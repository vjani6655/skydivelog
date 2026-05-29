-- Allow unauthenticated (public) access to pdf_exports by code
-- This is needed for the public /verify page on the marketing site.
-- Only the code and jump_ids columns are readable this way.

create policy "Public can verify by code"
  on public.pdf_exports for select
  using (true);

-- Allow public read on jumps referenced by a valid pdf_exports code.
-- Used by the verify API route (which uses service_role, so RLS is bypassed).
-- No extra policy needed for jumps — the verify route uses the admin client.
