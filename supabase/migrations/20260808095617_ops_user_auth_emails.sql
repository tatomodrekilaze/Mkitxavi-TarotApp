-- Ops console: batch-read auth emails for directory labels (service_role only).
-- Never writes to profiles — display-only fallback in the admin People list.

create or replace function public.ops_auth_emails(p_ids uuid[])
returns table (id uuid, email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.id, u.email::text
  from auth.users u
  where u.id = any (p_ids)
    and coalesce(u.email, '') <> '';
$$;

revoke all on function public.ops_auth_emails(uuid[]) from public, anon, authenticated;
grant execute on function public.ops_auth_emails(uuid[]) to service_role;
