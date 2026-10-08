-- Signup should let users in immediately. Email confirmation stays available
-- later (Settings resend / email-change flows) without blocking first entry.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.profiles (id, display_name, birth_date)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', ''),
    case
      when new.raw_user_meta_data ->> 'birth_date' ~ '^\d{4}-\d{2}-\d{2}$'
        then (new.raw_user_meta_data ->> 'birth_date')::date
      else null
    end
  )
  on conflict (id) do nothing;

  insert into public.energy_balance (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  -- Confirm email so sign-in after signup works even when Confirm email is on.
  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now())
  where id = new.id;

  return new;
end;
$$;
