-- Free energy: calendar-day allowance (daily_cap, default 5).
-- Tops up to daily_cap once per day. Unused does not stack.
-- Removes rolling next_free_refill_at cooldown behavior.

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
    updated_at = now()
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

-- Once per calendar day, refresh free grant up to daily_cap (keeps surplus from purchases/ads).
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
    and (last_refill_on is null or last_refill_on < current_date)
  returning balance into remaining;

  if remaining is null then
    select balance into remaining from public.energy_balance where user_id = uid;
  end if;

  return remaining;
end;
$$;

-- Clear any active cooldown timers from the previous model.
update public.energy_balance
set next_free_refill_at = null
where next_free_refill_at is not null;
