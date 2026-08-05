-- Lets a training day carry a short label ("Jambes", "Pec/Biceps"…) shown on
-- the programs list so the weekly split is visible without opening the
-- program. null means "no manual override" — the UI falls back to a label
-- computed from the muscle groups of that day's exercises (see
-- computeSuggestedMuscleGroupLabel in src/lib/sessions-api.ts). Storing only
-- the override, not the computed value, keeps it from going stale as
-- exercises are added/swapped/removed.
alter table public.session_templates
  add column muscle_group_label text;
