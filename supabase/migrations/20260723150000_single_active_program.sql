-- Enforce at most one 'active' program per user. Surfaced by a real gap:
-- the UI lets any program be flipped to 'active' independently, and both
-- the dashboard (HomePage) and the coach chat's program snapshot
-- (fetchActiveProgramSnapshot) silently pick "the most recently created
-- active program" when there's more than one — so a second activation
-- doesn't error, it just silently shadows the first one. Auto-demoting the
-- previously-active program to 'draft' matches how the UI already treats
-- status as a simple toggle rather than a guarded transition, and avoids a
-- confusing failed-request UX for what's really just "switch which
-- program I'm following".
create function public.handle_program_activated()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'active' then
    update public.programs
    set status = 'draft'
    where user_id = new.user_id
      and status = 'active'
      and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger on_program_activated
  before insert or update of status on public.programs
  for each row execute function public.handle_program_activated();
