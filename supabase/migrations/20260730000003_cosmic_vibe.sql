-- Optional mood captured during onboarding (third step).
alter table public.profiles
  add column if not exists cosmic_vibe text;
