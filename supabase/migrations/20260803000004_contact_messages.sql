-- Support / feedback inbox (filled from in-app forms).
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('support', 'feedback')),
  name text not null,
  email text not null,
  message text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists contact_messages_created_at_idx
  on public.contact_messages (created_at desc);

alter table public.contact_messages enable row level security;

-- Anyone (incl. anon) may submit a message; only service role reads them.
create policy "Anyone can submit contact messages"
  on public.contact_messages
  for insert
  to anon, authenticated
  with check (
    char_length(trim(name)) >= 1
    and char_length(trim(email)) >= 3
    and char_length(trim(message)) >= 3
    and char_length(message) <= 4000
  );
