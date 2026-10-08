-- Free energy: after the daily grant is spent to 0, wait 24 hours before the
-- next top-up to daily_cap. Replaces calendar-day refill (anti same-day farm).

alter table public.energy_balance
  add column if not exists next_free_refill_at timestamptz;

comment on column public.energy_balance.next_free_refill_at is
  'When free daily_cap energy becomes available again after balance hit 0. Null means no active cooldown.';

-- Users already at 0 start a cooldown now so they do not instantly re-claim.
update public.energy_balance
set next_free_refill_at = now() + interval '24 hours'
where balance <= 0
  and next_free_refill_at is null;

create or replace function public.spend_energy(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  sub_state text;
  sub_plan  text;
  remaining integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if amount is null or amount < 0 then
    raise exception 'amount must be >= 0' using errcode = '22023';
  end if;

  select status, plan into sub_state, sub_plan
  from public.subscriptions
  where user_id = uid;

  if sub_state in ('active', 'trialing') and sub_plan = 'ascended' then
    select balance into remaining from public.energy_balance where user_id = uid;
    return remaining;
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
    next_free_refill_at = case
      when (balance - amount) = 0
           and (next_free_refill_at is null or next_free_refill_at <= now())
        then now() + interval '24 hours'
      else next_free_refill_at
    end,
    updated_at = now()
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

-- Tops up to daily_cap once the 24h cooldown has elapsed (or balance is 0
-- with no cooldown set — recovery / brand-new edge case).
create or replace function public.claim_daily_energy()
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

  update public.energy_balance
  set
    balance = greatest(balance, daily_cap),
    last_refill_on = current_date,
    next_free_refill_at = null,
    updated_at = now()
  where user_id = uid
    and (
      (next_free_refill_at is not null and next_free_refill_at <= now())
      or (next_free_refill_at is null and balance <= 0)
    )
  returning balance into remaining;

  if remaining is null then
    select balance into remaining from public.energy_balance where user_id = uid;
  end if;

  return remaining;
end;
$$;
