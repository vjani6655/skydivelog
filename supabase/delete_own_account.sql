-- Allows an authenticated user to delete their own account.
-- Uses security definer so it can delete from auth.users.
create or replace function public.delete_own_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;

grant execute on function public.delete_own_account() to authenticated;
