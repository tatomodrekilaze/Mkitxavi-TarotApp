-- Flitt (Georgia PSP): order tracking + webhook idempotency + subscription refs.

alter table public.subscriptions
  add column if not exists flitt_order_id text,
  add column if not exists flitt_payment_id text,
  add column if not exists flitt_rectoken text;

create index if not exists subscriptions_flitt_order_id_idx
  on public.subscriptions (flitt_order_id);

create table if not exists public.flitt_orders (
  order_id    text primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  plan        text not null,
  amount      integer not null,
  currency    text not null default 'GEL',
  status      text not null default 'pending',
  payment_id  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists flitt_orders_user_id_idx
  on public.flitt_orders (user_id);

alter table public.flitt_orders enable row level security;
-- No policies: only service_role (bypasses RLS) reads/writes this table.

create table if not exists public.flitt_webhook_events (
  id           text primary key,
  type         text        not null,
  processed_at timestamptz not null default now()
);

alter table public.flitt_webhook_events enable row level security;
-- No policies: only service_role (bypasses RLS) reads/writes this table.
