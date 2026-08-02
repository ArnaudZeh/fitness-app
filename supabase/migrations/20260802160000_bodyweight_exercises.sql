-- Poids du corps sur un exercice (2026-08-02) : attribut du slot
-- (session_template_exercises), même convention que superset_group/
-- target_rest_seconds/is_unilateral — pas un nouveau concept séparé, un
-- booléen de plus sur "comment cet exercice est prescrit dans ce jour".
alter table public.session_template_exercises
  add column is_bodyweight boolean not null default false;

-- target_weight_kg (planifié) et actual_weight_kg (loggé) changent de sens
-- pour un exercice au poids du corps : ce n'est plus la charge totale
-- soulevée mais la charge additionnelle (lest, ex: +5kg) ou l'assistance
-- (machine assistée, ex: -10kg) par rapport au poids du corps seul — donc
-- signé. Les contraintes >= 0 (migrations 20260722110000, 20260727210000)
-- ne s'appliquent qu'aux exercices chargés normalement ; pas de nouvelle
-- borne basse pour autant, aucune des deux colonnes n'a de borne haute non
-- plus (numeric sans limite déjà).
alter table public.session_template_exercises
  drop constraint session_template_exercises_target_weight_kg_check;
alter table public.session_log_sets
  drop constraint session_log_sets_actual_weight_kg_check;

-- Un "record" en kg n'a de sens que pour une charge totale réelle — un
-- exercice au poids du corps loggerait la charge additionnelle/assistance
-- (une échelle différente, potentiellement négative) sous le même
-- exercise_id qu'une variante chargée normalement du même mouvement au
-- catalogue, ce qui produirait de faux "nouveaux records" en mélangeant
-- les deux échelles. Exclu de la détection au même titre que les séries à
-- plus d'une répétition.
create or replace function public.detect_one_rep_max_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_id uuid;
  v_exercise_name text;
  v_is_bodyweight boolean;
  v_prior_max numeric;
begin
  select ste.exercise_id, e.name, ste.is_bodyweight
  into v_exercise_id, v_exercise_name, v_is_bodyweight
  from public.session_template_exercises ste
  join public.exercises e on e.id = ste.exercise_id
  where ste.id = new.session_template_exercise_id;

  if new.actual_reps <> 1 or v_is_bodyweight then
    return new;
  end if;

  select max(s.actual_weight_kg) into v_prior_max
  from public.session_log_sets s
  join public.session_template_exercises ste2 on ste2.id = s.session_template_exercise_id
  where s.user_id = new.user_id
    and ste2.exercise_id = v_exercise_id
    and s.id <> new.id;

  if v_prior_max is null or new.actual_weight_kg > v_prior_max then
    insert into public.milestones (user_id, milestone_type, exercise_id, exercise_name, value)
    values (new.user_id, 'one_rep_max', v_exercise_id, v_exercise_name, new.actual_weight_kg);
  end if;

  return new;
end;
$$;
