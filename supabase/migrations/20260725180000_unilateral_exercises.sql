-- Option "unilatéral" sur un exercice de séance (2026-07-25) : un exercice
-- fait un côté puis l'autre (ex. tirage vertical câble en unilatéral),
-- plutôt que les deux bras/jambes en même temps.
--
-- Attribut du slot (session_template_exercises), pas de l'exercice lui-même
-- (exercises) — le même exercice peut être prescrit en bilatéral dans un
-- programme et en unilatéral dans un autre. Même convention que
-- superset_group/target_rest_seconds (migrations 20260722091000 /
-- 20260722110000) : un booléen optionnel de plus sur "comment cet exercice
-- est prescrit dans ce jour", pas un nouveau concept séparé.
alter table public.session_template_exercises
  add column is_unilateral boolean not null default false;

-- Le logging en direct a besoin de savoir QUEL côté chaque série
-- enregistrée concerne. 'both' (pas juste nullable) pour les exercices
-- bilatéraux — un vrai tri-état plutôt que null, sinon la contrainte
-- d'unicité ci-dessous ne protégerait plus rien pour eux (deux NULL ne se
-- valent jamais égaux dans une contrainte unique Postgres, donc deux
-- lignes side=null au même set_number ne se bloqueraient pas mutuellement).
alter table public.session_log_sets
  add column side text not null default 'both' check (side in ('left', 'right', 'both'));

-- Un exercice unilatéral a deux lignes par set_number (une par côté) —
-- l'ancienne contrainte (session_log_id, session_template_exercise_id,
-- set_number) l'interdisait. `side` inclus dans la contrainte : un
-- exercice bilatéral (toujours side='both') garde exactement une ligne par
-- set_number comme avant, un exercice unilatéral en garde deux (left/right).
alter table public.session_log_sets
  drop constraint session_log_sets_session_log_id_session_template_exercise_i_key;
alter table public.session_log_sets
  add constraint session_log_sets_log_slot_set_side_key
  unique (session_log_id, session_template_exercise_id, set_number, side);

-- Un record à 1 répétition d'un seul côté n'est pas comparable au 1RM
-- bilatéral du même exercice (ex. un exercice fait tantôt à deux bras,
-- tantôt à un bras selon le programme) — exclu de la détection de jalon
-- plutôt que de fausser le "nouveau record" annoncé dans le feed.
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
  if new.actual_reps <> 1 or new.side <> 'both' then
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
    and s.id <> new.id
    and s.side = 'both';

  if v_prior_max is null or new.actual_weight_kg > v_prior_max then
    insert into public.milestones (user_id, milestone_type, exercise_id, exercise_name, value)
    values (new.user_id, 'one_rep_max', v_exercise_id, v_exercise_name, new.actual_weight_kg);
  end if;

  return new;
end;
$$;
