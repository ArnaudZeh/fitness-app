-- P9a — Fondations de la couche sociale : opt-in de partage, détection
-- automatique de nouveaux records (1RM estimé), feed en lecture seule.
-- Première feature du projet qui expose délibérément des données entre
-- utilisateurs — cadrée en cercle fermé et opt-in (brief : "quelques amis
-- et collègues"), jamais un réseau ouvert.
alter table public.profiles
  add column social_sharing_enabled boolean not null default false;

-- profiles a des colonnes sensibles (date_of_birth, sex, cycle_module_enabled,
-- target_weight_kg...) qu'on ne peut pas exposer via une policy RLS
-- permissive "opted-in" sur la table elle-même — RLS filtre des LIGNES, pas
-- des colonnes. Cette vue, créée sans `security_invoker` (donc avec les
-- droits du propriétaire, comportement par défaut), peut lire toute la
-- table mais ne projette que ce qui est sûr à montrer à d'autres
-- utilisateurs. La policy existante sur profiles (auth.uid() = id) reste
-- inchangée pour toute requête directe sur la table.
create view public.public_profiles as
select id, display_name
from public.profiles
where social_sharing_enabled;

grant select on public.public_profiles to authenticated;

-- exercise_name est un instantané (copié depuis exercises.name au moment de
-- la détection), pas une référence vive — un jalon sur un exercice custom
-- doit rester lisible dans le feed même pour un autre utilisateur qui n'a
-- pas accès à ce catalogue custom (RLS d'exercises est scopée par
-- propriétaire pour les exercices non-système). exercise_id est conservé en
-- plus, pour un usage futur éventuel, mais le feed n'en dépend jamais.
create table public.milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  milestone_type text not null check (
    milestone_type in ('one_rep_max', 'weekly_tonnage', 'regularity_streak')
  ),
  exercise_id uuid references public.exercises (id) on delete set null,
  exercise_name text,
  value numeric(7, 2) not null,
  achieved_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.milestones enable row level security;

-- Aucune policy insert/update/delete pour authenticated — un jalon
-- n'est jamais écrit par le client, uniquement par le trigger ci-dessous
-- (qui s'exécute avec les droits du propriétaire de la migration, donc
-- contourne RLS comme le trigger de création des session_templates).
create policy "Users can view their own milestones and opted-in others'"
  on public.milestones for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = milestones.user_id and p.social_sharing_enabled
    )
  );

create index milestones_achieved_at_idx on public.milestones (achieved_at desc);
create index milestones_user_id_exercise_id_idx on public.milestones (user_id, exercise_id);

-- Même formule que estimateOneRepMax côté client (src/lib/one-rep-max.ts) :
-- moyenne Epley/Brzycki, fiable seulement pour 1-12 reps et un poids > 0.
-- Fonction séparée pour ne pas dupliquer la formule dans le trigger (calcul
-- de la nouvelle valeur + calcul du record précédent).
create or replace function public.estimate_one_rep_max(p_weight_kg numeric, p_reps int)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case
    when p_reps < 1 or p_reps > 12 or p_weight_kg <= 0 then null
    else (
      (p_weight_kg * (1 + p_reps / 30.0))
      + (p_weight_kg * 36 / (37 - p_reps))
    ) / 2
  end
$$;

create or replace function public.detect_one_rep_max_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_exercise_id uuid;
  v_exercise_name text;
  v_estimated_1rm numeric;
  v_prior_max numeric;
begin
  v_estimated_1rm := public.estimate_one_rep_max(new.actual_weight_kg, new.actual_reps);
  if v_estimated_1rm is null then
    return new;
  end if;

  select ste.exercise_id, e.name into v_exercise_id, v_exercise_name
  from public.session_template_exercises ste
  join public.exercises e on e.id = ste.exercise_id
  where ste.id = new.session_template_exercise_id;

  select max(public.estimate_one_rep_max(s.actual_weight_kg, s.actual_reps))
  into v_prior_max
  from public.session_log_sets s
  join public.session_template_exercises ste2 on ste2.id = s.session_template_exercise_id
  where s.user_id = new.user_id
    and ste2.exercise_id = v_exercise_id
    and s.id <> new.id;

  if v_prior_max is null or v_estimated_1rm > v_prior_max then
    insert into public.milestones (user_id, milestone_type, exercise_id, exercise_name, value)
    values (new.user_id, 'one_rep_max', v_exercise_id, v_exercise_name, v_estimated_1rm);
  end if;

  return new;
end;
$$;

create trigger detect_one_rep_max_milestone_trigger
  after insert on public.session_log_sets
  for each row execute function public.detect_one_rep_max_milestone();
