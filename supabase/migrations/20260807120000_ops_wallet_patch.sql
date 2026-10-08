-- Reliable ops wallet mutations (balance / unlimited / daily_cap) via one RPC.

create or replace function public.ops_patch_wallet(
  p_user_id uuid,
  p_balance integer default null,
  p_unlimited boolean default null,
  p_daily_cap integer default null
)
returns table (balance integer, unlimited boolean, daily_cap integer)
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user_id is null then
    raise exception 'user required' using errcode = '22023';
  end if;

  insert into public.energy_balance (user_id, balance, unlimited, daily_cap)
  values (
    p_user_id,
    greatest(0, coalesce(p_balance, 0)),
    coalesce(p_unlimited, false),
    greatest(0, coalesce(p_daily_cap, 5))
  )
  on conflict (user_id) do update
    set
      balance = case
        when p_balance is null then public.energy_balance.balance
        else greatest(0, p_balance)
      end,
      unlimited = case
        when p_unlimited is null then public.energy_balance.unlimited
        else p_unlimited
      end,
      daily_cap = case
        when p_daily_cap is null then public.energy_balance.daily_cap
        else greatest(0, p_daily_cap)
      end,
      updated_at = now();

  return query
    select e.balance, e.unlimited, e.daily_cap
    from public.energy_balance e
    where e.user_id = p_user_id;
end;
$$;

revoke all on function public.ops_patch_wallet(uuid, integer, boolean, integer)
  from public, anon, authenticated;
grant execute on function public.ops_patch_wallet(uuid, integer, boolean, integer)
  to service_role;
