-- Optional newsletter / marketing consent captured at signup.
alter table public.profiles
  add column if not exists marketing_opt_in boolean not null default false,
  add column if not exists marketing_opt_in_at timestamptz;

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
    marketing_opt_in_at
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
    case when wants_marketing then now() else null end
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

  return new;
end;
$$;
