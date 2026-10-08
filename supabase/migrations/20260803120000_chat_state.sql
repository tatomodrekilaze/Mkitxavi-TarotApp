-- Persist Maria chat history per user (cross-device memory).
create table if not exists public.chat_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  service text null,
  updated_at timestamptz not null default now()
);

alter table public.chat_state enable row level security;

create policy "Users read own chat_state"
  on public.chat_state
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users upsert own chat_state"
  on public.chat_state
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users update own chat_state"
  on public.chat_state
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users delete own chat_state"
  on public.chat_state
  for delete
  to authenticated
  using (auth.uid() = user_id);
