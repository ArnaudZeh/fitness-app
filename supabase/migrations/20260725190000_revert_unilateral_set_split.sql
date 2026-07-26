-- Retour en arrière sur le suivi séparé gauche/droite (2026-07-25) : après
-- retour du user, deux séries loguées par série physique (une par côté)
-- n'apportait rien — le nombre de séries est de toute façon le même des
-- deux côtés, pas besoin de le tracer séparément. `is_unilateral` reste
-- une simple information affichée sur le slot (session_template_exercises,
-- migration 20260725180000) : badge visible côté programme et côté
-- séance, sans changer la façon de loguer une série.

alter table public.session_log_sets
  drop constraint session_log_sets_log_slot_set_side_key;
alter table public.session_log_sets
  add constraint session_log_sets_session_log_id_session_template_exercise_i_key
  unique (session_log_id, session_template_exercise_id, set_number);

alter table public.session_log_sets drop column side;

create or replace function public.detect_one_rep_max_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_id uuid;
  v_exercise_name text;
  v_prior_max numeric;
begin
  if new.actual_reps <> 1 then
    return new;
  end if;

  select ste.exercise_id, e.name into v_exercise_id, v_exercise_name
  from public.session_template_exercises ste
  join public.exercises e on e.id = ste.exercise_id
  where ste.id = new.session_template_exercise_id;

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
