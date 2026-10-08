-- ===========================================================================
-- Nina, initial schema
--
-- Identity lives in Supabase's built-in `auth.users`. Everything here hangs
-- off that via `auth.uid()`. There is no guest tier: a row cannot exist
-- without an authenticated owner.
--
-- Mirrors the shape previously held in localStorage under `mkitxavi.state.v1`.
-- ===========================================================================

-- --- profiles --------------------------------------------------------------
-- 1:1 with auth.users. Replaces `UserProfile` plus the lang/muted/streak
-- fields from AppContext's StoredState.
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text        not null default '',
  avatar_url          text,
  birth_date          date,
  interests           text[]      not null default '{}',
  hobbies             text[]      not null default '{}',
  lang                text        check (lang in ('ka', 'en', 'ru')),
  muted               boolean     not null default false,
  onboarding_complete boolean     not null default false,
  streak              integer     not null default 0 check (streak >= 0),
  best_streak         integer     not null default 0 check (best_streak >= 0),
  last_visit          date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- --- energy_balance --------------------------------------------------------
-- Deliberately a separate table from profiles: it is the one value users have
-- an incentive to tamper with, so it gets its own no-write RLS policy and is
-- mutated only through the SECURITY DEFINER functions at the bottom.
create table if not exists public.energy_balance (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  balance         integer     not null default 10 check (balance >= 0),
  daily_cap       integer     not null default 10 check (daily_cap >= 0),
  last_refill_on  date,
  -- Ad-reward accounting. Tracked server-side because the client asserting
  -- "I watched an ad" is not evidence of anything.
  ad_claims_on    date,
  ad_claims_today integer     not null default 0 check (ad_claims_today >= 0),
  updated_at      timestamptz not null default now()
);

-- --- subscriptions ---------------------------------------------------------
-- Written by Stripe webhooks (service role) in Phase 3, never by the client.
-- `status` is the superset of the app's SubStatus and Stripe's own states.
create table if not exists public.subscriptions (
  user_id                uuid primary key references auth.users (id) on delete cascade,
  status                 text        not null default 'none'
    check (status in ('none', 'active', 'cancelled', 'past_due', 'trialing')),
  stripe_customer_id     text,
  stripe_subscription_id text,
  price_id               text,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean     not null default false,
  updated_at             timestamptz not null default now()
);

create index if not exists subscriptions_stripe_customer_id_idx
  on public.subscriptions (stripe_customer_id);

-- --- reading_history -------------------------------------------------------
-- The thing that is currently lost on every refresh.
-- `cards` stores TAROT_DECK keys so a past spread can be re-rendered with the
-- existing imagery; `input` holds per-kind payloads (compatibility signs,
-- quiz answers) without needing a table per feature.
create table if not exists public.reading_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references auth.users (id) on delete cascade,
  kind         text        not null check (kind in ('tarot', 'compatibility', 'personality', 'zodiac')),
  lang         text        not null check (lang in ('ka', 'en', 'ru')),
  cards        text[]      not null default '{}',
  input        jsonb       not null default '{}'::jsonb,
  result_text  text        not null default '',
  energy_spent integer     not null default 0 check (energy_spent >= 0),
  created_at   timestamptz not null default now()
);

create index if not exists reading_history_user_created_idx
  on public.reading_history (user_id, created_at desc);

-- ===========================================================================
-- Row Level Security
--
-- Enabled on every table. The anon key is public by design, so these policies
-- are the actual security boundary.
-- ===========================================================================

alter table public.profiles        enable row level security;
alter table public.energy_balance  enable row level security;
alter table public.subscriptions   enable row level security;
alter table public.reading_history enable row level security;

-- profiles: users fully manage their own row (but cannot create one for
-- someone else, and cannot delete, that cascades from auth.users).
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own"
  on public.profiles for insert
  with check (auth.uid() = id);

-- energy_balance: READ ONLY for users. No insert/update/delete policy exists,
-- so RLS denies those outright, a user cannot set their own balance to 9999.
-- All mutation goes through spend_energy / grant_energy below.
drop policy if exists "energy: read own" on public.energy_balance;
create policy "energy: read own"
  on public.energy_balance for select
  using (auth.uid() = user_id);

-- subscriptions: READ ONLY for users. Only Stripe webhooks (service role,
-- which bypasses RLS) may write, so `active` always reflects real payment.
drop policy if exists "subscriptions: read own" on public.subscriptions;
create policy "subscriptions: read own"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- reading_history: users read and append their own readings.
drop policy if exists "readings: read own" on public.reading_history;
create policy "readings: read own"
  on public.reading_history for select
  using (auth.uid() = user_id);

drop policy if exists "readings: insert own" on public.reading_history;
create policy "readings: insert own"
  on public.reading_history for insert
  with check (auth.uid() = user_id);

-- ===========================================================================
-- Provisioning
-- ===========================================================================

-- Every new auth.users row gets its three companion rows atomically, so the
-- app never has to cope with a half-provisioned account.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Name and birth date are collected on the sign-up form and arrive here as
  -- user metadata, so the profile is never blank by the time onboarding runs.
  insert into public.profiles (id, display_name, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    -- Guard against a malformed value making the whole signup fail.
    case
      when new.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.energy_balance (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- --- updated_at ------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists energy_touch_updated_at on public.energy_balance;
create trigger energy_touch_updated_at
  before update on public.energy_balance
  for each row execute function public.touch_updated_at();

drop trigger if exists subscriptions_touch_updated_at on public.subscriptions;
create trigger subscriptions_touch_updated_at
  before update on public.subscriptions
  for each row execute function public.touch_updated_at();

-- ===========================================================================
-- Energy operations
--
-- These are the only path to changing a balance. SECURITY DEFINER lets them
-- write past the read-only RLS policy, while `auth.uid()` keeps each caller
-- pinned to their own row.
-- ===========================================================================

-- Returns the balance after spending. An active subscription is unlimited and
-- leaves the balance untouched. Raises if the user cannot afford `amount`, so
-- the caller cannot silently proceed with a reading it did not pay for.
create or replace function public.spend_energy(amount integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid       uuid := auth.uid();
  sub_state text;
  remaining integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if amount is null or amount < 0 then
    raise exception 'amount must be >= 0' using errcode = '22023';
  end if;

  select status into sub_state
  from public.subscriptions
  where user_id = uid;

  if sub_state in ('active', 'trialing') then
    select balance into remaining from public.energy_balance where user_id = uid;
    return remaining;
  end if;

  -- Row lock makes concurrent readings from two tabs safe.
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

-- Tops a user up to their daily cap, at most once per calendar day.
-- Safe to call on every app load; it no-ops if already claimed today.
-- NOTE: not yet wired to the UI, pending a decision on the refill model.
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
  set balance        = greatest(balance, daily_cap),
      last_refill_on = current_date
  where user_id = uid
    and (last_refill_on is null or last_refill_on < current_date)
  returning balance into remaining;

  if remaining is null then
    select balance into remaining from public.energy_balance where user_id = uid;
  end if;

  return remaining;
end;
$$;

-- Ad reward. A placeholder until a real ad network is integrated, but the
-- ceiling is enforced here rather than in the UI, so the worst a tampered
-- client can do is claim the rewards it was already entitled to.
create or replace function public.claim_ad_energy()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid           uuid    := auth.uid();
  reward        integer := 5;
  max_per_day   integer := 1;
  claims_so_far integer;
  remaining     integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  -- Reset the counter when the day rolls over.
  update public.energy_balance
  set ad_claims_today = 0,
      ad_claims_on    = current_date
  where user_id = uid
    and (ad_claims_on is null or ad_claims_on < current_date);

  select ad_claims_today into claims_so_far
  from public.energy_balance
  where user_id = uid
  for update;

  if claims_so_far is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if claims_so_far >= max_per_day then
    raise exception 'daily ad limit reached' using errcode = 'P0001';
  end if;

  update public.energy_balance
  set balance         = balance + reward,
      ad_claims_today = ad_claims_today + 1,
      ad_claims_on    = current_date
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

-- ===========================================================================
-- Backfill
--
-- The trigger above only fires on insert, so accounts that already existed
-- when this migration ran would otherwise have no companion rows.
-- ===========================================================================

insert into public.profiles (id, display_name, birth_date)
select
  u.id,
  coalesce(u.raw_user_meta_data ->> 'display_name', ''),
  case
    when u.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
      then (u.raw_user_meta_data ->> 'birth_date')::date
    else null
  end
from auth.users u
on conflict (id) do nothing;

insert into public.energy_balance (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

insert into public.subscriptions (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- Trigger helpers are not part of the public API surface.
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.spend_energy(integer) from public, anon;
revoke all on function public.claim_daily_energy()  from public, anon;
revoke all on function public.claim_ad_energy()     from public, anon;
grant execute on function public.spend_energy(integer) to authenticated;
grant execute on function public.claim_daily_energy()  to authenticated;
grant execute on function public.claim_ad_energy()     to authenticated;
