-- Ops console: granular RBAC, complimentary grants, unlimited energy,
-- feature flags, in-app announcements, support macros.

-- 1. Staff: per-user permission overrides + provisioning metadata.
alter table public.ops_staff_users
  add column if not exists permissions jsonb not null default '[]'::jsonb,
  add column if not exists denied_permissions jsonb not null default '[]'::jsonb,
  add column if not exists created_by text,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists note text;

alter table public.ops_staff_users drop constraint if exists ops_staff_users_role_check;
alter table public.ops_staff_users
  add constraint ops_staff_users_role_check check (
    role in (
      'owner', 'co_owner', 'superadmin', 'admin', 'developer',
      'manager', 'moderator', 'support', 'staff'
    )
  );

-- 2. Energy: staff can hand out unlimited energy (bypasses spend + caps).
alter table public.energy_balance
  add column if not exists unlimited boolean not null default false;

comment on column public.energy_balance.unlimited is
  'Ops grant: spend_energy never deducts and the paywall treats the user as uncapped.';

-- 3. Subscriptions: complimentary (free) grants issued from the console.
alter table public.subscriptions
  add column if not exists is_comp boolean not null default false,
  add column if not exists granted_by text,
  add column if not exists grant_note text;

-- 4. Watchlist flag for soft monitoring without a ban.
alter table public.profiles
  add column if not exists watchlist boolean not null default false;

create index if not exists profiles_watchlist_idx
  on public.profiles (watchlist) where watchlist = true;

-- 5. Grant ledger — every comp/energy action is auditable.
create table if not exists public.ops_grants (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('energy', 'energy_unlimited', 'daily_cap', 'subscription', 'revoke')),
  amount integer,
  plan text,
  days integer,
  expires_at timestamptz,
  note text,
  actor_username text,
  created_at timestamptz not null default now()
);

create index if not exists ops_grants_user_idx on public.ops_grants (user_id, created_at desc);
create index if not exists ops_grants_created_idx on public.ops_grants (created_at desc);

-- 6. Feature flags / kill switches read by the app.
create table if not exists public.ops_feature_flags (
  key text primary key,
  enabled boolean not null default false,
  value jsonb not null default '{}'::jsonb,
  description text,
  updated_by text,
  updated_at timestamptz not null default now()
);

-- 7. In-app announcements / maintenance banners.
create table if not exists public.ops_announcements (
  id bigserial primary key,
  title text not null,
  body text not null default '',
  level text not null default 'info' check (level in ('info', 'warn', 'critical')),
  lang text not null default 'all',
  active boolean not null default true,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists ops_announcements_active_idx
  on public.ops_announcements (active, starts_at desc);

-- 8. Support macros (canned replies).
create table if not exists public.ops_saved_replies (
  id bigserial primary key,
  title text not null,
  body text not null,
  lang text not null default 'all',
  created_by text,
  created_at timestamptz not null default now()
);

alter table public.ops_grants enable row level security;
alter table public.ops_feature_flags enable row level security;
alter table public.ops_announcements enable row level security;
alter table public.ops_saved_replies enable row level security;

revoke all on public.ops_grants from anon, authenticated, public;
revoke all on public.ops_feature_flags from anon, authenticated, public;
revoke all on public.ops_saved_replies from anon, authenticated, public;
revoke all on public.ops_announcements from anon, authenticated, public;

grant all on public.ops_grants to service_role;
grant all on public.ops_feature_flags to service_role;
grant all on public.ops_announcements to service_role;
grant all on public.ops_saved_replies to service_role;
grant usage, select on sequence public.ops_grants_id_seq to service_role;
grant usage, select on sequence public.ops_announcements_id_seq to service_role;
grant usage, select on sequence public.ops_saved_replies_id_seq to service_role;

-- Signed-in users may read live announcements (banner in app).
grant select on public.ops_announcements to authenticated;

drop policy if exists ops_announcements_read_live on public.ops_announcements;
create policy ops_announcements_read_live on public.ops_announcements
  for select to authenticated
  using (active and starts_at <= now() and (ends_at is null or ends_at > now()));

-- 9. spend_energy honours the unlimited grant.
create or replace function public.spend_energy(amount integer)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  uid          uuid := auth.uid();
  remaining    integer;
  is_unlimited boolean;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if amount is null or amount < 0 then
    raise exception 'amount must be >= 0' using errcode = '22023';
  end if;

  select balance, unlimited into remaining, is_unlimited
  from public.energy_balance
  where user_id = uid
  for update;

  if remaining is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if is_unlimited then
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
$function$;

-- 10. Atomic energy adjust for staff (positive or negative delta, floors at 0).
create or replace function public.ops_adjust_energy(p_user_id uuid, p_delta integer)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  remaining integer;
begin
  if p_user_id is null then
    raise exception 'user required' using errcode = '22023';
  end if;

  insert into public.energy_balance (user_id, balance)
  values (p_user_id, greatest(0, coalesce(p_delta, 0)))
  on conflict (user_id) do update
    set balance = greatest(0, public.energy_balance.balance + coalesce(p_delta, 0)),
        updated_at = now()
  returning balance into remaining;

  return remaining;
end;
$function$;

revoke all on function public.ops_adjust_energy(uuid, integer) from public, anon, authenticated;
grant execute on function public.ops_adjust_energy(uuid, integer) to service_role;

-- 11. Seed default flags + macros.
insert into public.ops_feature_flags (key, enabled, description)
values
  ('maintenance_mode', false, 'Show maintenance banner and block new readings.'),
  ('ads_enabled', true, 'Serve AdSense units and the watch-ad energy reward.'),
  ('signups_enabled', true, 'Allow new account registration.'),
  ('coffee_reading_enabled', true, 'Photo/coffee reading availability.'),
  ('chat_enabled', true, 'Global kill switch for AI chat.')
on conflict (key) do nothing;

insert into public.ops_saved_replies (title, body, lang, created_by)
select 'Energy explained',
       'Your daily free energy refills every calendar day. Watch an ad or upgrade for more readings.',
       'en', 'system'
where not exists (select 1 from public.ops_saved_replies where title = 'Energy explained');

insert into public.ops_saved_replies (title, body, lang, created_by)
select 'Refund policy',
       'Subscriptions can be cancelled any time and stay active until the end of the paid period.',
       'en', 'system'
where not exists (select 1 from public.ops_saved_replies where title = 'Refund policy');
