-- Restore unlimited short-circuit (removed by harden_client_trust_surfaces).
-- Ops-granted unlimited must never deduct or fail at 0.

create or replace function public.spend_energy(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  remaining integer;
  is_unlim  boolean;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if amount is null or amount < 1 then
    raise exception 'amount must be >= 1' using errcode = '22023';
  end if;

  select balance, unlimited
    into remaining, is_unlim
  from public.energy_balance
  where user_id = uid
  for update;

  if remaining is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if coalesce(is_unlim, false) then
    return remaining;
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
