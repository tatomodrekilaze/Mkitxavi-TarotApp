-- Reliable onboarding finish: ensure profile row exists, write taste fields,
-- and flip onboarding_complete. Client UPDATE + maybeSingle was returning ok
-- with no row when the profile was missing, which reset users to step 1 forever.

create or replace function public.complete_onboarding(
  p_interests text[] default '{}',
  p_hobbies text[] default '{}',
  p_cosmic_vibe text default null,
  p_lang text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
  clean_interests text[] := coalesce(p_interests, '{}');
  clean_hobbies text[] := coalesce(p_hobbies, '{}');
  clean_vibe text := nullif(trim(coalesce(p_cosmic_vibe, '')), '');
  clean_lang text := nullif(trim(coalesce(p_lang, '')), '');
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if coalesce(array_length(clean_interests, 1), 0) < 1 then
    raise exception 'interests required' using errcode = '22023';
  end if;
  if coalesce(array_length(clean_hobbies, 1), 0) < 1 then
    raise exception 'hobbies required' using errcode = '22023';
  end if;
  if clean_vibe is null then
    raise exception 'cosmic vibe required' using errcode = '22023';
  end if;

  -- Cap length (UI allows up to 3 each).
  clean_interests := clean_interests[1:3];
  clean_hobbies := clean_hobbies[1:3];

  insert into public.profiles (id, interests, hobbies, cosmic_vibe, lang, onboarding_complete)
  values (
    uid,
    clean_interests,
    clean_hobbies,
    clean_vibe,
    case when clean_lang in ('ka', 'en', 'ru') then clean_lang else 'ka' end,
    true
  )
  on conflict (id) do update
    set
      interests = excluded.interests,
      hobbies = excluded.hobbies,
      cosmic_vibe = excluded.cosmic_vibe,
      lang = coalesce(excluded.lang, public.profiles.lang),
      onboarding_complete = true,
      updated_at = now()
  returning * into row;

  insert into public.energy_balance (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  insert into public.subscriptions (user_id)
  values (uid)
  on conflict (user_id) do nothing;

  return row;
end;
$$;

revoke all on function public.complete_onboarding(text[], text[], text, text) from public, anon;
grant execute on function public.complete_onboarding(text[], text[], text, text) to authenticated;
