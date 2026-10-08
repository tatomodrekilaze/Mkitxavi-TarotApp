alter table public.profiles
  add column if not exists email_verify_sent_at timestamptz;

comment on column public.profiles.email_verify_sent_at is
  'Set when user requests a verify link; cleared when email_verified becomes true.';
