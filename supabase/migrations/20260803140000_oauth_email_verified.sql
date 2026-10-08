-- OAuth users with a real email (Google / Facebook) start verified in Settings.
-- Facebook phone-only signups have no email → stay email_verified = false.
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
  provider text := coalesce(new.raw_app_meta_data ->> 'provider', 'email');
  has_email boolean := new.email is not null and new.email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
  oauth_verified boolean := false;
begin
  if has_email and provider in ('google', 'facebook') then
    oauth_verified := true;
  end if;

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
    oauth_verified
  )
  on conflict (id) do update
    set
      display_name = coalesce(nullif(excluded.display_name, ''), public.profiles.display_name),
      birth_date = coalesce(excluded.birth_date, public.profiles.birth_date),
      marketing_opt_in = excluded.marketing_opt_in,
      marketing_opt_in_at = excluded.marketing_opt_in_at,
      -- Promote to verified when OAuth later supplies a real email; never downgrade.
      email_verified = public.profiles.email_verified or excluded.email_verified;

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
