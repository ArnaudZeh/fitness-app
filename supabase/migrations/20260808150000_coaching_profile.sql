-- Fiche profil coaching étendue (~65 champs, 13 catégories) : donne au coach IA
-- "privé" (déjà branché via buildUserProfileContext(), voir user-context.ts) et
-- à un futur export vers un LLM externe un contexte proche de ce qu'un coach
-- sportif réel demanderait à un nouveau client. Table séparée plutôt qu'une
-- extension de `profiles` (comme sex/goal/height_cm l'avaient été) : `profiles`
-- reste focalisé identité/réglages, et surtout aucune de ces colonnes ne doit
-- jamais transiter par `friend_profile_details` ou une policy "amis/public" —
-- contrairement à goal/display_name, tout ici reste strictement privé.
--
-- Tout est nullable : comme le reste du profil (P22004643), remplir la fiche
-- est conseillé, jamais bloquant. Quelques champs à choix fermé (goal_horizon,
-- pregnancy_status, fitness_level, diet_type) gardent un check() ; le reste
-- est du texte libre pour rester flexible pour l'IA, quitte à être présenté
-- comme un select côté UI plus tard sans contrainte serveur.
create table public.coaching_profile (
  id uuid primary key references auth.users (id) on delete cascade,

  -- Objectifs & motivation
  secondary_goals text,
  goal_horizon text check (goal_horizon in ('aucune', '3_mois', '6_mois', '1_an')),
  target_event text,
  motivation_why text,
  past_attempts text,
  success_definition text,

  -- Antécédents médicaux
  diagnosed_conditions text,
  current_medications text,
  past_surgeries text,
  family_medical_history text,
  medical_followup text,
  last_checkup_date date,
  pregnancy_status text check (pregnancy_status in ('non', 'enceinte', 'post_partum')),
  medical_clearance boolean,

  -- Blessures & limitations physiques
  current_injuries text,
  chronic_injuries text,
  recurring_pain text,
  contraindicated_movements text,
  physio_osteo_followup text,

  -- Expérience sportive
  fitness_level text check (
    fitness_level in ('debutant', 'intermediaire', 'avance', 'athlete')
  ),
  years_training numeric(4, 1) check (years_training >= 0),
  current_sports text,
  past_sports text,
  competitive_background text,
  key_lift_prs text,
  favorite_exercises text,
  disliked_exercises text,
  body_focus_preference text,
  prior_coaching_experience text,

  -- Nutrition & habitudes alimentaires
  diet_type text check (
    diet_type in ('omnivore', 'vegetarien', 'vegan', 'pescetarien', 'cetogene', 'autre')
  ),
  meals_per_day smallint check (meals_per_day > 0),
  snacking_habits text,
  cooking_habits text,
  food_budget_monthly numeric(7, 2) check (food_budget_monthly >= 0),
  favorite_foods text,
  disliked_foods text,
  food_allergies text,
  food_intolerances text,
  daily_water_intake_l numeric(3, 1) check (daily_water_intake_l >= 0),
  eating_disorder_history text,
  macro_tracking_experience text,
  estimated_daily_calories integer check (estimated_daily_calories > 0),

  -- Compléments alimentaires
  current_supplements text,
  past_supplements text,
  supplement_budget_monthly numeric(7, 2) check (supplement_budget_monthly >= 0),
  supplement_preferences text,
  supplement_reluctances text,

  -- Sommeil
  avg_sleep_hours numeric(3, 1) check (avg_sleep_hours >= 0),
  sleep_quality text,
  bedtime time,
  wake_time time,
  sleep_disorders text,
  screens_before_bed boolean,

  -- Stress & mode de vie
  stress_level smallint check (stress_level between 1 and 10),
  stress_sources text,
  occupation_type text,
  daily_sitting_hours numeric(3, 1) check (daily_sitting_hours >= 0),
  avg_daily_steps integer check (avg_daily_steps >= 0),
  family_context text,
  travel_frequency text,

  -- Consommation
  smoking_status text,
  alcohol_consumption text,
  caffeine_intake text,

  -- Logistique d'entraînement
  training_location text,
  home_equipment text,
  gym_access_details text,
  available_days_times text,
  session_duration_preference_min smallint check (session_duration_preference_min > 0),
  training_alone_or_group text,
  travel_constraints text,

  -- Spécificités hormonales — le cycle menstruel lui-même reste sur
  -- profiles.cycle_module_enabled/cycle_entries (P8), pas dupliqué ici.
  contraception_method text,
  menopause_status text,

  -- Psychologie & adhérence
  past_dropout_reasons text,
  adherence_motivators text,
  structure_preference text,
  discomfort_tolerance text,
  scale_relationship text,
  communication_style_preference text,

  -- Outils connectés
  wearable_device text,
  tracking_apps_used text,
  wants_data_sync boolean,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.coaching_profile enable row level security;

create policy "Users can view their own coaching profile"
  on public.coaching_profile for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own coaching profile"
  on public.coaching_profile for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger set_coaching_profile_updated_at
  before update on public.coaching_profile
  for each row execute function public.set_updated_at();

-- Même trigger que profiles (P0) : une ligne coaching_profile est créée en
-- même temps que la ligne profiles à l'inscription, jamais via une policy
-- insert cliente — sinon le client aurait besoin d'un aller-retour
-- insert-puis-update au premier remplissage de la fiche.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'display_name');
  insert into public.coaching_profile (id) values (new.id);
  return new;
end;
$$;
