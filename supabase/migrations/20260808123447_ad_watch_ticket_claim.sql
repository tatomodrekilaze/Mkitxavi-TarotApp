-- Ad energy must not be claimable by the browser directly.
-- Server (service_role) issues a timed ticket, then redeems it after the watch window.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.ad_watch_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  token_hash text not null unique,
  source text not null check (source in ('overlay', 'gam', 'simulate')),
  created_at timestamptz not null default timezone('utc', now()),
  eligible_at timestamptz not null,
  expires_at timestamptz not null,
  consumed_at timestamptz
);

create index if not exists ad_watch_tickets_user_pending_idx
  on public.ad_watch_tickets (user_id, created_at desc)
  where consumed_at is null;

alter table public.ad_watch_tickets enable row level security;
revoke all on table public.ad_watch_tickets from public, anon, authenticated;

-- Remove the old trust-the-client zero-arg claim.
drop function if exists public.claim_ad_energy();

create or replace function public.begin_ad_watch(p_user_id uuid, p_source text default 'overlay')
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  src text := lower(coalesce(nullif(trim(p_source), ''), 'overlay'));
  min_watch_seconds integer := 28;
  max_per_day integer := 5;
  claims_so_far integer;
  pending integer;
  raw_token text;
  ticket_id uuid;
  elig_at timestamptz;
  exp_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if src not in ('overlay', 'gam', 'simulate') then
    raise exception 'invalid source' using errcode = '22023';
  end if;

  -- Overlay/simulate must wait the fullscreen countdown; GAM can be shorter.
  if src = 'gam' then
    min_watch_seconds := 8;
  end if;

  update public.energy_balance
  set ad_claims_today = 0,
      ad_claims_on = current_date
  where user_id = p_user_id
    and (ad_claims_on is null or ad_claims_on < current_date);

  select ad_claims_today into claims_so_far
  from public.energy_balance
  where user_id = p_user_id
  for update;

  if claims_so_far is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if claims_so_far >= max_per_day then
    raise exception 'daily ad limit reached' using errcode = 'P0001';
  end if;

  select count(*)::integer into pending
  from public.ad_watch_tickets
  where user_id = p_user_id
    and consumed_at is null
    and expires_at > timezone('utc', now());

  if pending >= 2 then
    raise exception 'too many pending ad watches' using errcode = 'P0001';
  end if;

  raw_token := encode(gen_random_bytes(32), 'hex');
  elig_at := timezone('utc', now()) + make_interval(secs => min_watch_seconds);
  exp_at := timezone('utc', now()) + interval '10 minutes';

  insert into public.ad_watch_tickets (user_id, token_hash, source, eligible_at, expires_at)
  values (
    p_user_id,
    encode(digest(raw_token, 'sha256'), 'hex'),
    src,
    elig_at,
    exp_at
  )
  returning id into ticket_id;

  return jsonb_build_object(
    'ticket', raw_token,
    'ticket_id', ticket_id,
    'eligible_at', elig_at,
    'expires_at', exp_at,
    'min_watch_seconds', min_watch_seconds
  );
end;
$$;

create or replace function public.claim_ad_energy(p_user_id uuid, p_ticket text)
returns integer
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  reward integer := 1;
  max_per_day integer := 5;
  claims_so_far integer;
  remaining integer;
  ticket public.ad_watch_tickets%rowtype;
  thash text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if p_user_id is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if p_ticket is null or length(trim(p_ticket)) < 32 then
    raise exception 'invalid ticket' using errcode = '22023';
  end if;

  thash := encode(digest(trim(p_ticket), 'sha256'), 'hex');

  select * into ticket
  from public.ad_watch_tickets
  where token_hash = thash
    and user_id = p_user_id
  for update;

  if ticket.id is null then
    raise exception 'invalid ticket' using errcode = 'P0002';
  end if;

  if ticket.consumed_at is not null then
    raise exception 'ticket already used' using errcode = 'P0001';
  end if;

  if ticket.expires_at <= timezone('utc', now()) then
    raise exception 'ticket expired' using errcode = 'P0001';
  end if;

  if ticket.eligible_at > timezone('utc', now()) then
    raise exception 'watch not finished' using errcode = 'P0001';
  end if;

  update public.energy_balance
  set ad_claims_today = 0,
      ad_claims_on = current_date
  where user_id = p_user_id
    and (ad_claims_on is null or ad_claims_on < current_date);

  select ad_claims_today into claims_so_far
  from public.energy_balance
  where user_id = p_user_id
  for update;

  if claims_so_far is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if claims_so_far >= max_per_day then
    raise exception 'daily ad limit reached' using errcode = 'P0001';
  end if;

  update public.ad_watch_tickets
  set consumed_at = timezone('utc', now())
  where id = ticket.id;

  update public.energy_balance
  set balance = balance + reward,
      ad_claims_today = ad_claims_today + 1,
      ad_claims_on = current_date
  where user_id = p_user_id
  returning balance into remaining;

  return remaining;
end;
$$;

revoke all on function public.begin_ad_watch(uuid, text) from public, anon, authenticated;
revoke all on function public.claim_ad_energy(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_ad_watch(uuid, text) to service_role;
grant execute on function public.claim_ad_energy(uuid, text) to service_role;
