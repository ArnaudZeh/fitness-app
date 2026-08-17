-- Deload as a 4th program focus (see TODOS.md "Programmes — duplication
-- avec focus + réduction de charge pour deload"). Reuses the existing
-- focus mechanism (same labels/rest-defaults machinery) rather than a new
-- "program type" concept — a deload isn't really a training goal like the
-- other three, but the pragmatic fit outweighs the conceptual purity here.
alter table public.programs
  drop constraint programs_focus_check;

alter table public.programs
  add constraint programs_focus_check
  check (focus in ('force', 'hypertrophie', 'endurance', 'deload'));
