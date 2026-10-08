alter table public.profiles
  add column if not exists streak_rewards_claimed integer[] not null default '{}';

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
    when 7   then 5
    when 10  then 10
    when 20  then 20
    when 50  then 50
    when 100 then 100
    else null
  end;

  if reward is null then
    raise exception 'unknown milestone' using errcode = '22023';
  end if;

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
