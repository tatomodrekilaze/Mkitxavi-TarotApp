-- Durable per-user AI reply rate limit (sliding 1-minute window).
-- Caps billable Gemini calls so multi-instance / cold-start bypass of the
-- in-memory Map cannot burn quota. claim_ai_reply_slot inserts a row when
-- under the cap; clients have no direct table access.

create table if not exists public.ai_reply_rate_events (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists ai_reply_rate_events_user_created_idx
  on public.ai_reply_rate_events (user_id, created_at desc);

alter table public.ai_reply_rate_events enable row level security;

-- No client policies: only the security definer RPC may touch this table.
revoke all on table public.ai_reply_rate_events from public, anon, authenticated;

create or replace function public.claim_ai_reply_slot(
  p_max_per_minute integer default 20
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  uid    uuid := auth.uid();
  recent integer;
  cap    integer := coalesce(p_max_per_minute, 20);
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if cap < 1 then
    raise exception 'invalid cap' using errcode = '22023';
  end if;

  -- Opportunistic prune of stale rows for this user (keeps the table tiny).
  delete from public.ai_reply_rate_events
  where user_id = uid
    and created_at < now() - interval '2 minutes';

  select count(*)::integer
  into recent
  from public.ai_reply_rate_events
  where user_id = uid
    and created_at > now() - interval '1 minute';

  if recent >= cap then
    return false;
  end if;

  insert into public.ai_reply_rate_events (user_id)
  values (uid);

  return true;
end;
$$;

revoke all on function public.claim_ai_reply_slot(integer) from public, anon;
grant execute on function public.claim_ai_reply_slot(integer) to authenticated;
