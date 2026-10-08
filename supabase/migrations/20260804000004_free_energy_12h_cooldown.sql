-- Shorten free-energy cooldown from 24h → 12h (feels shorter in the UI clock).

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
        then now() + interval '12 hours'
      else next_free_refill_at
    end,
    updated_at = now()
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

-- Cap any active 24h timers so the clock does not stay near 23:xx.
update public.energy_balance
set next_free_refill_at = least(next_free_refill_at, now() + interval '12 hours')
where next_free_refill_at is not null
  and next_free_refill_at > now();
