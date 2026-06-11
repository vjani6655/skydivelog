-- Allow jump owners to update signatures on their own jumps (needed for re-signing after edits)
create policy "Users can update signatures on own jumps"
  on public.signatures for update
  using (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.jumps j where j.id = jump_id and j.user_id = auth.uid())
  );
