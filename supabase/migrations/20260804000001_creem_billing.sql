-- Creem MoR: customer/subscription ids + webhook idempotency.

alter table public.subscriptions
  add column if not exists creem_customer_id text,
  add column if not exists creem_subscription_id text;

create index if not exists subscriptions_creem_customer_id_idx
  on public.subscriptions (creem_customer_id);

create table if not exists public.creem_webhook_events (
  id           text primary key,
  type         text        not null,
  processed_at timestamptz not null default now()
);

alter table public.creem_webhook_events enable row level security;
-- No policies: only service_role (bypasses RLS) reads/writes this table.
