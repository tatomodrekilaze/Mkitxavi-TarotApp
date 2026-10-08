-- Contact/feedback flood protection.
--
-- The insert policy let anon submit unlimited rows straight through the anon
-- key, so the inbox was trivially floodable. Submissions now go through a
-- definer function that caps them per email (and per signed-in user) per hour,
-- and the direct insert policy is withdrawn so the cap cannot be side-stepped.

create index if not exists contact_messages_email_created_idx
  on public.contact_messages (lower(email), created_at desc);

create index if not exists contact_messages_user_created_idx
  on public.contact_messages (user_id, created_at desc);

create or replace function public.submit_contact_message(
  p_kind    text,
  p_name    text,
  p_email   text,
  p_message text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  recent integer;
  uid    uuid := auth.uid();
begin
  if p_kind is null or p_kind not in ('support', 'feedback') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  if char_length(trim(coalesce(p_name, ''))) < 1
     or char_length(trim(coalesce(p_email, ''))) < 3
     or char_length(trim(coalesce(p_message, ''))) < 3
     or char_length(p_message) > 4000
     or char_length(p_name) > 120
     or char_length(p_email) > 200 then
    raise exception 'invalid payload' using errcode = '22023';
  end if;

  select count(*)
  into recent
  from public.contact_messages
  where created_at > now() - interval '1 hour'
    and (
      lower(email) = lower(trim(p_email))
      or (uid is not null and user_id = uid)
    );

  if recent >= 5 then
    raise exception 'contact rate limit reached' using errcode = 'P0001';
  end if;

  insert into public.contact_messages (kind, name, email, message, user_id)
  values (p_kind, trim(p_name), trim(p_email), p_message, uid);
end;
$$;

-- Withdraw the unlimited direct-insert path.
drop policy if exists "Anyone can submit contact messages" on public.contact_messages;

revoke all on function public.submit_contact_message(text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text)
  to anon, authenticated;
