-- Defense-in-depth: no client DML on money/ops tables; tighten spend; ad wait always 28s;
-- revoke callable trigger helpers; reading_history insert is service-role only.

-- 1) Money + history table privileges -----------------------------------------
revoke all on table public.energy_balance from public, anon, authenticated;
grant select on table public.energy_balance to authenticated;

revoke all on table public.subscriptions from public, anon, authenticated;
grant select on table public.subscriptions to authenticated;

revoke all on table public.reading_history from public, anon, authenticated;
grant select on table public.reading_history to authenticated;

revoke all on table public.ad_watch_tickets from public, anon, authenticated;

-- 2) Trigger helpers must not be RPC-callable --------------------------------
revoke all on function public.profiles_protect_privileged() from public, anon, authenticated;
revoke all on function public.touch_updated_at() from public, anon, authenticated;

-- 3) spend_energy: reject zero / negative (no free probe RPC) ----------------
create or replace function public.spend_energy(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  remaining integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if amount is null or amount < 1 then
    raise exception 'amount must be >= 1' using errcode = '22023';
  end if;

  select balance into remaining
  from public.energy_balance
  where user_id = uid
  for update;

  if remaining is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if remaining < amount then
    raise exception 'insufficient energy' using errcode = 'P0001';
  end if;

  update public.energy_balance
  set
    balance = balance - amount,
    updated_at = now()
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

revoke all on function public.spend_energy(integer) from public, anon;
grant execute on function public.spend_energy(integer) to authenticated;

-- 4) Ad tickets: always require full watch window (ignore short gam shortcut) -
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
    src := 'overlay';
  end if;

  -- Never trust a shorter client-chosen source. All rewards wait the full window.
  min_watch_seconds := 28;

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

revoke all on function public.begin_ad_watch(uuid, text) from public, anon, authenticated;
grant execute on function public.begin_ad_watch(uuid, text) to service_role;
