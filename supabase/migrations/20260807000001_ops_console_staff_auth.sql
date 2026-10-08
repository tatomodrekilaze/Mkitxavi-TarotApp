-- Ops console staff auth (separate from public /admin honeypot).

create extension if not exists pgcrypto;

create table if not exists public.ops_staff_users (
  id uuid primary key default gen_random_uuid(),
  username text not null unique,
  password_hash text not null,
  role text not null check (role in ('owner', 'co_owner', 'developer', 'manager', 'admin', 'staff', 'support', 'moderator')),
  display_name text not null,
  disabled boolean not null default false,
  failed_logins integer not null default 0,
  locked_until timestamptz,
  last_login_at timestamptz,
  last_login_ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ops_staff_ip_allowlist (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.ops_staff_users(id) on delete cascade,
  ip text not null,
  label text,
  created_at timestamptz not null default now(),
  unique (staff_user_id, ip)
);

create table if not exists public.ops_staff_sessions (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.ops_staff_users(id) on delete cascade,
  token_hash text not null unique,
  ip text not null,
  user_agent text,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ops_staff_sessions_user_idx on public.ops_staff_sessions (staff_user_id);
create index if not exists ops_staff_sessions_expires_idx on public.ops_staff_sessions (expires_at);

create table if not exists public.ops_ip_challenges (
  id uuid primary key default gen_random_uuid(),
  staff_user_id uuid not null references public.ops_staff_users(id) on delete cascade,
  ip text not null,
  user_agent text,
  token_hash text not null unique,
  status text not null default 'pending' check (status in ('pending', 'allowed', 'denied', 'expired')),
  expires_at timestamptz not null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists ops_ip_challenges_pending_idx
  on public.ops_ip_challenges (staff_user_id, status, expires_at);

create table if not exists public.ops_events (
  id bigserial primary key,
  category text not null,
  action text not null,
  actor_staff_id uuid references public.ops_staff_users(id) on delete set null,
  actor_username text,
  target_user_id uuid,
  ip text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ops_events_created_idx on public.ops_events (created_at desc);
create index if not exists ops_events_category_idx on public.ops_events (category, created_at desc);

alter table public.ops_staff_users enable row level security;
alter table public.ops_staff_ip_allowlist enable row level security;
alter table public.ops_staff_sessions enable row level security;
alter table public.ops_ip_challenges enable row level security;
alter table public.ops_events enable row level security;

revoke all on public.ops_staff_users from anon, authenticated, public;
revoke all on public.ops_staff_ip_allowlist from anon, authenticated, public;
revoke all on public.ops_staff_sessions from anon, authenticated, public;
revoke all on public.ops_ip_challenges from anon, authenticated, public;
revoke all on public.ops_events from anon, authenticated, public;

grant all on public.ops_staff_users to service_role;
grant all on public.ops_staff_ip_allowlist to service_role;
grant all on public.ops_staff_sessions to service_role;
grant all on public.ops_ip_challenges to service_role;
grant all on public.ops_events to service_role;
grant usage, select on sequence public.ops_events_id_seq to service_role;

-- Create staff accounts for your own deployment.
-- No default staff accounts or password hashes are shipped.
