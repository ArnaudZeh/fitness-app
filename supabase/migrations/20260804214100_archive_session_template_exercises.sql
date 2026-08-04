-- Removing an exercise slot (manual "Supprimer", "Adapter avec l'IA",
-- "Dupliquer un jour") used to hard-delete the row outright — and
-- session_log_sets.session_template_exercise_id references it
-- `on delete cascade`, so every set ever logged against that exercise was
-- silently destroyed along with it. Confirmed happening in production: a
-- shoulder-day exercise slot was removed (moved to a different weekday),
-- permanently wiping 15 real logged sets that referenced it, discovered
-- only because the client's local offline cache still had a stale copy the
-- server no longer did.
--
-- archived_at marks a slot as removed from the active plan without
-- deleting it, so its history stays intact and correctly attributed to the
-- exercise it actually was. Every read of "the current exercises for this
-- day" filters archived_at is null; nothing else changes for a slot with
-- no history, which can still be hard-deleted immediately (see
-- deleteSessionTemplateExercise in src/lib/sessions-api.ts).
alter table public.session_template_exercises
  add column archived_at timestamptz;
