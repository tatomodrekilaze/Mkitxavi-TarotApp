-- Whop billing columns + daily caps for Mystic (30) / Ascended (150).
-- Ascended is no longer unlimited — everyone spends from balance.

alter table public.subscriptions
  add column if not exists whop_membership_id text,
  add column if not exists whop_customer_id text,
  add column if not exists whop_manage_url text;

create index if not exists subscriptions_whop_membership_id_idx
  on public.subscriptions (whop_membership_id);

create table if not exists public.whop_webhook_events (
  id           text primary key,
  type         text        not null,
  processed_at timestamptz not null default now()
);

alter table public.whop_webhook_events enable row level security;

-- Set plan daily allowance and top balance up to that cap (keeps surplus).
create or replace function public.apply_plan_daily_cap(p_user_id uuid, p_daily_cap integer)
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

  if p_daily_cap is null or p_daily_cap < 0 then
    raise exception 'daily_cap must be >= 0' using errcode = '22023';
  end if;

  update public.energy_balance
  set
    daily_cap = p_daily_cap,
    balance = greatest(balance, p_daily_cap),
    last_refill_on = current_date,
    next_free_refill_at = null,
    updated_at = now()
  where user_id = p_user_id
  returning balance into remaining;

  if remaining is null then
    insert into public.energy_balance (user_id, balance, daily_cap, last_refill_on)
    values (p_user_id, p_daily_cap, p_daily_cap, current_date)
    returning balance into remaining;
  end if;

  return remaining;
end;
$$;

revoke all on function public.apply_plan_daily_cap(uuid, integer) from public, anon, authenticated;
grant execute on function public.apply_plan_daily_cap(uuid, integer) to service_role;

-- Everyone spends energy, including Ascended (daily cap enforces the allowance).
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

  if amount is null or amount < 0 then
    raise exception 'amount must be >= 0' using errcode = '22023';
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
