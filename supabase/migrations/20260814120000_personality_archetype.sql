-- Persist Tarot & Magic personality quiz result on the profile (forever until Redo).
-- Not a privileged field: users may update their own result via RLS.

alter table public.profiles
  add column if not exists personality_archetype text;

alter table public.profiles
  drop constraint if exists profiles_personality_archetype_check;

alter table public.profiles
  add constraint profiles_personality_archetype_check
  check (
    personality_archetype is null
    or personality_archetype in ('priestess', 'magician', 'hermit', 'empress')
  );

comment on column public.profiles.personality_archetype is
  'Tarot & Magic quiz result (major-arcana archetype). Cleared only when the user opts into Redo.';
