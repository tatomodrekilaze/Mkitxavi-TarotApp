-- Ads may be claimed only once per calendar day (+5 energy).
create or replace function public.claim_ad_energy()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  uid           uuid    := auth.uid();
  reward        integer := 5;
  max_per_day   integer := 1;
  claims_so_far integer;
  remaining     integer;
begin
  if uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  update public.energy_balance
  set ad_claims_today = 0,
      ad_claims_on    = current_date
  where user_id = uid
    and (ad_claims_on is null or ad_claims_on < current_date);

  select ad_claims_today into claims_so_far
  from public.energy_balance
  where user_id = uid
  for update;

  if claims_so_far is null then
    raise exception 'no energy row for user' using errcode = 'P0002';
  end if;

  if claims_so_far >= max_per_day then
    raise exception 'daily ad limit reached' using errcode = 'P0001';
  end if;

  update public.energy_balance
  set balance         = balance + reward,
      ad_claims_today = ad_claims_today + 1,
      ad_claims_on    = current_date
  where user_id = uid
  returning balance into remaining;

  return remaining;
end;
$$;

revoke all on function public.claim_ad_energy() from public, anon;
grant execute on function public.claim_ad_energy() to authenticated;
