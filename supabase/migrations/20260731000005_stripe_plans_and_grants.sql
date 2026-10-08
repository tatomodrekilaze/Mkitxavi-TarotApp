-- Stripe: plan tier on subscriptions + atomic purchase grants + webhook idempotency.
-- Ascended = unlimited readings; Mystic = monthly energy grant via webhook (not unlimited).

alter table public.subscriptions
  add column if not exists plan text not null default 'none'
    check (plan in ('none', 'mystic', 'ascended'));

create table if not exists public.stripe_webhook_events (
  id           text primary key,
  type         text        not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- No policies: only service_role (bypasses RLS) reads/writes this table.

create or replace function public.grant_purchase_energy(p_user_id uuid, p_amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  remaining integer;
begin
  if p_user_id is null then
    raise exception 'user required' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'amount must be > 0' using errcode = '22023';
  end if;

  insert into public.energy_balance (user_id, balance)
  values (p_user_id, p_amount)
  on conflict (user_id) do update
    set balance = public.energy_balance.balance + excluded.balance
  returning balance into remaining;

  return remaining;
end;
$$;

revoke all on function public.grant_purchase_energy(uuid, integer) from public, anon, authenticated;
grant execute on function public.grant_purchase_energy(uuid, integer) to service_role;

-- Only Ascended (active/trialing) skips the balance. Mystic spends from balance.
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
  set balance = balance - amount
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;
