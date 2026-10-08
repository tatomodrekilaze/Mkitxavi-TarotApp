-- Classic Ultra ops console: moderation, inbox workflow, farm fingerprints, changelog.

alter table public.profiles
  add column if not exists banned boolean not null default false,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz,
  add column if not exists banned_by text,
  add column if not exists chat_restricted boolean not null default false,
  add column if not exists mod_notes text;

comment on column public.profiles.banned is 'Ops console hard ban — blocked from app use.';
comment on column public.profiles.chat_restricted is 'Ops console soft restrict — chat/readings blocked.';

create index if not exists profiles_banned_idx on public.profiles (banned) where banned = true;
create index if not exists profiles_chat_restricted_idx
  on public.profiles (chat_restricted) where chat_restricted = true;
create index if not exists profiles_created_at_idx on public.profiles (created_at desc);

alter table public.contact_messages
  add column if not exists status text not null default 'open'
    check (status in ('open', 'pending', 'resolved', 'spam')),
  add column if not exists staff_reply text,
  add column if not exists resolved_at timestamptz,
  add column if not exists resolved_by text,
  add column if not exists assigned_to text;

create index if not exists contact_messages_status_idx
  on public.contact_messages (status, created_at desc);

-- Device / farm fingerprint links (client may report; staff can manage).
create table if not exists public.ops_device_links (
  id uuid primary key default gen_random_uuid(),
  fingerprint_hash text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  ip text,
  user_agent text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  flagged boolean not null default false,
  note text,
  unique (fingerprint_hash, user_id)
);

create index if not exists ops_device_links_fp_idx on public.ops_device_links (fingerprint_hash);
create index if not exists ops_device_links_user_idx on public.ops_device_links (user_id);
create index if not exists ops_device_links_flagged_idx
  on public.ops_device_links (flagged) where flagged = true;

alter table public.ops_device_links enable row level security;
revoke all on public.ops_device_links from anon, authenticated, public;
grant all on public.ops_device_links to service_role;

-- Internal staff changelog / release notes for the console itself.
create table if not exists public.ops_changelog (
  id bigserial primary key,
  title text not null,
  body text not null default '',
  author_username text,
  created_at timestamptz not null default now()
);

alter table public.ops_changelog enable row level security;
revoke all on public.ops_changelog from anon, authenticated, public;
grant all on public.ops_changelog to service_role;
grant usage, select on sequence public.ops_changelog_id_seq to service_role;

insert into public.ops_changelog (title, body, author_username)
select
  'Classic Ultra console online',
  'Users, moderation, support inbox, security, billing, energy/farm, developer tools, and staff IP controls.',
  'system'
where not exists (
  select 1 from public.ops_changelog where title = 'Classic Ultra console online'
);
