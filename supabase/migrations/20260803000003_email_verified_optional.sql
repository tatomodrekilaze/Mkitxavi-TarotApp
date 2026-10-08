-- App-level email verification badge (Settings). Auth login is not blocked:
-- we confirm auth.users so sign-in works immediately; profiles.email_verified
-- stays false until the user opens a verification / magic link.
alter table public.profiles
  add column if not exists email_verified boolean not null default false;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  wants_marketing boolean := coalesce(
    (new.raw_user_meta_data ->> 'marketing_opt_in') in ('true', 't', '1', 'yes'),
    false
  );
begin
  insert into public.profiles (
    id,
    display_name,
    birth_date,
    marketing_opt_in,
    marketing_opt_in_at,
    email_verified
  )
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when new.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end,
    wants_marketing,
    case when wants_marketing then now() else null end,
    false
  )
  on conflict (id) do update
    set
      display_name = coalesce(excluded.display_name, public.profiles.display_name),
      birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
      marketing_opt_in = excluded.marketing_opt_in,
      marketing_opt_in_at = excluded.marketing_opt_in_at;

  insert into public.energy_balance (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Allow immediate sign-in even when Dashboard "Confirm email" is on.
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;
