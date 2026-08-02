-- Liberté de remplacer un exercice en pleine séance (machine prise,
-- indisponible…) sans perdre le suivi. Nullable : null = "l'exercice prévu
-- au planning" (cas normal, aucune ligne existante affectée par cet ajout) ;
-- un id = l'exercice réellement réalisé pour cette série précise, si
-- différent du planning. Les séries déjà loguées avant un remplacement en
-- séance restent attribuées à l'exercice d'origine, celles d'après au
-- nouvel exercice — les deux coexistent dans la même séance.
alter table public.session_log_sets
  add column exercise_id uuid references public.exercises (id);
