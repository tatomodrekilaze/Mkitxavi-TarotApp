-- Harden profiles: clients must not rewrite moderation, streak, or email_verified.
-- Streak + email verification move to SECURITY DEFINER RPCs.
-- DEFINER RPCs set a transaction-local GUC so the guard trigger allows them.

create or replace function public.profiles_protect_privileged()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Service role (ops, webhooks, admin client) may change anything.
  if coalesce(auth.role(), '') = 'service_role' then
    return new;
  end if;

  -- Trusted SECURITY DEFINER RPCs opt in via set_config(..., is_local => true).
  if current_setting('app.allow_privileged_profile', true) = 'on' then
    return new;
  end if;

  if new.banned is distinct from old.banned
     or new.ban_reason is distinct from old.ban_reason
     or new.banned_at is distinct from old.banned_at
     or new.banned_by is distinct from old.banned_by
     or new.chat_restricted is distinct from old.chat_restricted
     or new.mod_notes is distinct from old.mod_notes
     or new.watchlist is distinct from old.watchlist
     or new.streak is distinct from old.streak
     or new.best_streak is distinct from old.best_streak
     or new.last_visit is distinct from old.last_visit
     or new.streak_rewards_claimed is distinct from old.streak_rewards_claimed
     or new.email_verified is distinct from old.email_verified
  then
    raise exception 'cannot modify privileged profile fields'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_protect_privileged on public.profiles;
create trigger profiles_protect_privileged
  before update on public.profiles
  for each row
  execute function public.profiles_protect_privileged();

-- Advance login streak once per calendar day (server-side only).
create or replace function public.record_daily_streak()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur_streak integer;
  cur_best integer;
  cur_visit date;
  today date := (timezone('utc', now()))::date;
  next_streak integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform set_config('app.allow_privileged_profile', 'on', true);

  select streak, best_streak, last_visit
    into cur_streak, cur_best, cur_visit
  from public.profiles
  where id = uid
  for update;

  if cur_streak is null then
    raise exception 'no profile' using errcode = 'P0002';
  end if;

  if cur_visit = today then
    return jsonb_build_object(
      'streak', cur_streak,
      'best_streak', cur_best,
      'last_visit', cur_visit
    );
  end if;

  if cur_visit is not null and cur_visit = today - 1 then
    next_streak := cur_streak + 1;
  else
    next_streak := 1;
  end if;

  update public.profiles
  set
    streak = next_streak,
    best_streak = greatest(cur_best, next_streak),
    last_visit = today
  where id = uid
  returning streak, best_streak, last_visit
    into cur_streak, cur_best, cur_visit;

  return jsonb_build_object(
    'streak', cur_streak,
    'best_streak', cur_best,
    'last_visit', cur_visit
  );
end;
$$;

revoke all on function public.record_daily_streak() from public, anon;
grant execute on function public.record_daily_streak() to authenticated;

-- Set email_verified only when Auth already confirmed the mailbox.
create or replace function public.sync_email_verified()
returns boolean
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  uid uuid := auth.uid();
  confirmed_at timestamptz;
  mail text;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select u.email_confirmed_at, u.email
    into confirmed_at, mail
  from auth.users u
  where u.id = uid;

  if confirmed_at is null or mail is null or length(trim(mail)) = 0 then
    return false;
  end if;

  perform set_config('app.allow_privileged_profile', 'on', true);

  update public.profiles
  set email_verified = true,
      email_verify_sent_at = null
  where id = uid;

  return true;
end;
$$;

revoke all on function public.sync_email_verified() from public, anon;
grant execute on function public.sync_email_verified() to authenticated;

-- Used when the user requests an email change (new address unconfirmed).
create or replace function public.mark_email_unverified()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  perform set_config('app.allow_privileged_profile', 'on', true);

  update public.profiles
  set email_verified = false,
      email_verify_sent_at = null
  where id = uid;
end;
$$;

revoke all on function public.mark_email_unverified() from public, anon;
grant execute on function public.mark_email_unverified() to authenticated;

-- Existing streak claim RPC also writes streak_rewards_claimed — must opt in.
create or replace function public.claim_streak_reward(milestone integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid        uuid := auth.uid();
  cur_streak integer;
  claimed    integer[];
  reward     integer;
  remaining  integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  reward := case milestone
    when 5   then 5
    when 10  then 10
    when 20  then 20
    when 50  then 50
    when 100 then 100
    else null
  end;

  if reward is null then
    raise exception 'unknown milestone' using errcode = '22023';
  end if;

  perform set_config('app.allow_privileged_profile', 'on', true);

  select streak, streak_rewards_claimed
    into cur_streak, claimed
  from public.profiles
  where id = uid
  for update;

  if cur_streak is null then
    raise exception 'no profile' using errcode = 'P0002';
  end if;

  if cur_streak < milestone then
    raise exception 'streak too low' using errcode = 'P0001';
  end if;

  if claimed @> array[milestone] then
    raise exception 'already claimed' using errcode = 'P0001';
  end if;

  update public.profiles
  set streak_rewards_claimed = array_append(streak_rewards_claimed, milestone)
  where id = uid;

  update public.energy_balance
  set balance = balance + reward
  where user_id = uid
  returning balance into remaining;

  if remaining is null then
    raise exception 'no energy row' using errcode = 'P0002';
  end if;

  return remaining;
end;
$$;

revoke all on function public.claim_streak_reward(integer) from public, anon;
grant execute on function public.claim_streak_reward(integer) to authenticated;
