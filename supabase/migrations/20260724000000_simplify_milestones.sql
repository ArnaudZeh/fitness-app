-- Simplification des jalons, à la demande du user : uniquement l'atteinte
-- d'un objectif de poids et un vrai record de 1RM (série à 1 répétition).
-- Tonnage hebdomadaire et streak de régularité retirés entièrement — jugés
-- trop bruyants pour la valeur perçue.

-- Ces deux types disparaissent complètement, y compris l'historique déjà
-- généré — contrairement au changement de méthode du 1RM plus bas, qui ne
-- touche pas les jalons 1RM déjà obtenus (des vrais records qui ont eu
-- lieu, pas à effacer rétroactivement juste parce que la règle de
-- détection change pour la suite).
delete from public.milestones where milestone_type in ('weekly_tonnage', 'regularity_streak');

drop trigger detect_weekly_tonnage_milestone_trigger on public.session_log_sets;
drop trigger detect_regularity_streak_milestone_trigger on public.session_log_sets;
drop function public.detect_weekly_tonnage_milestone();
drop function public.detect_regularity_streak_milestone();
drop function public.iso_week_start(timestamptz);

drop index public.milestones_weekly_tonnage_user_week_idx;
drop index public.milestones_regularity_streak_user_week_idx;
alter table public.milestones drop column week_start;

alter table public.milestones drop constraint milestones_milestone_type_check;
alter table public.milestones add constraint milestones_milestone_type_check
  check (milestone_type in ('one_rep_max', 'weight_goal'));

-- Un vrai record de 1RM désormais : uniquement quand la série est
-- effectivement à 1 répétition (une vraie tentative de max), comparée au
-- poids le plus lourd jamais soulevé sur cet exercice — jamais une
-- estimation via la formule Epley/Brzycki depuis une série à plus de reps
-- (l'ancien comportement : une série de 5 un peu lourde n'a plus besoin de
-- se transformer en "record" annoncé). create or replace en place plutôt
-- que recréer le trigger — celui de P9a (detect_one_rep_max_milestone_trigger)
-- reste inchangé et utilise la nouvelle version de la fonction directement.
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

drop function public.estimate_one_rep_max(numeric, int);

-- Objectif de poids atteint : compare le poids logué au jour J à
-- profiles.target_weight_kg. Idempotent par "arrivée" plutôt que par
-- semaine (comme les jalons retirés plus haut) : ne compte que la
-- transition depuis un poids différent de l'objectif vers l'objectif —
-- rester pile dessus plusieurs jours de suite ne doit pas spammer un
-- nouveau jalon chaque jour. AFTER INSERT OR UPDATE car logWeightEntry()
-- fait un upsert sur (user_id, recorded_at) : reloguer le même jour est un
-- UPDATE, pas un INSERT.
create or replace function public.detect_weight_goal_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target numeric;
  v_previous_weight numeric;
begin
  select target_weight_kg into v_target
  from public.profiles
  where id = new.user_id;

  if v_target is null or new.weight_kg <> v_target then
    return new;
  end if;

  select weight_kg into v_previous_weight
  from public.weight_entries
  where user_id = new.user_id
    and recorded_at < new.recorded_at
  order by recorded_at desc
  limit 1;

  if v_previous_weight is null or v_previous_weight <> v_target then
    insert into public.milestones (user_id, milestone_type, value, achieved_at)
    values (new.user_id, 'weight_goal', new.weight_kg, now());
  end if;

  return new;
end;
$$;

create trigger detect_weight_goal_milestone_trigger
  after insert or update on public.weight_entries
  for each row execute function public.detect_weight_goal_milestone();
