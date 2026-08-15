-- Suivi nutrition (calories/macros) — P0, schéma de base. Plan de phases
-- complet noté dans TODOS.md ("Nutrition — plan de phases scopé"). Trois
-- tables :
--
-- meal_slots : les repas d'un utilisateur (nom + ordre), configurables
-- librement — nombre et noms choisis par l'utilisateur, pas un enum fixe
-- petit-déj/déjeuner/dîner/collation (voulu explicitement, même patron que
-- les séances d'un programme). Contrairement à session_templates (7 jours
-- fixes créés par trigger), rien n'est seedé ici : l'onboarding "combien de
-- repas par jour ?" de P1 crée les lignes.
--
-- Suppression d'un repas : archived_at plutôt qu'un hard delete par
-- défaut, pour éviter la même perte de données déjà rencontrée avec
-- session_template_exercises (voir 20260804214100_archive_session_template_exercises.sql,
-- 15 séries perdues en prod) — un repas encore référencé par de l'historique
-- loggé ne doit jamais entraîner une cascade de suppression sur food_logs.
-- Un repas jamais utilisé reste hard-deletable côté client (même logique
-- que deleteSessionTemplateExercise).
--
-- nutrition_targets : 1:1 par utilisateur, même patron que coaching_profile
-- (id = auth.users.id directement, ligne auto-créée par handle_new_user,
-- jamais d'insert client). Contient le niveau d'activité auto-déclaré et
-- les cibles calculées (calories/macros), overridables manuellement par le
-- client via update — pas de distinction "calculé" vs "override" en base,
-- la ligne est toujours la source de vérité courante.
--
-- food_logs : une entrée par aliment loggé, rattachée à un repas. Pas de
-- colonne source/external_id pour l'instant — inutile tant que P2
-- (recherche OpenFoodFacts) n'existe pas, ajoutée à ce moment-là.
--
-- Visibilité : strictement propriétaire sur les trois tables, jamais dans
-- friend_profile_details ni aucune vue publique — même choix que
-- coaching_profile (données nutrition/santé, contrairement à
-- weight_entries/body_measurements qui sont partagées avec les amis).

create table public.meal_slots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  order_index integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.meal_slots enable row level security;

create policy "Users can view their own meal slots"
  on public.meal_slots for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own meal slots"
  on public.meal_slots for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own meal slots"
  on public.meal_slots for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own meal slots"
  on public.meal_slots for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_meal_slots_updated_at
  before update on public.meal_slots
  for each row execute function public.set_updated_at();

create index meal_slots_user_id_order_idx
  on public.meal_slots (user_id, order_index);

create table public.nutrition_targets (
  id uuid primary key references auth.users (id) on delete cascade,
  activity_level text check (
    activity_level in ('sedentaire', 'leger', 'modere', 'actif', 'tres_actif')
  ),
  calories_target integer check (calories_target > 0),
  protein_g_target integer check (protein_g_target >= 0),
  carbs_g_target integer check (carbs_g_target >= 0),
  fat_g_target integer check (fat_g_target >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.nutrition_targets enable row level security;

create policy "Users can view their own nutrition targets"
  on public.nutrition_targets for select
  to authenticated
  using (auth.uid() = id);

create policy "Users can update their own nutrition targets"
  on public.nutrition_targets for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create trigger set_nutrition_targets_updated_at
  before update on public.nutrition_targets
  for each row execute function public.set_updated_at();

create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  meal_slot_id uuid not null references public.meal_slots (id),
  logged_date date not null default current_date,
  name text not null,
  calories integer not null check (calories >= 0),
  protein_g numeric(6, 1) check (protein_g >= 0),
  carbs_g numeric(6, 1) check (carbs_g >= 0),
  fat_g numeric(6, 1) check (fat_g >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.food_logs enable row level security;

create policy "Users can view their own food logs"
  on public.food_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own food logs"
  on public.food_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own food logs"
  on public.food_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own food logs"
  on public.food_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_food_logs_updated_at
  before update on public.food_logs
  for each row execute function public.set_updated_at();

create index food_logs_user_id_logged_date_idx
  on public.food_logs (user_id, logged_date desc);

-- Même trigger que profiles/coaching_profile : une ligne nutrition_targets
-- est créée en même temps qu'un compte s'inscrit, jamais via une policy
-- insert cliente — le premier remplissage (calcul auto des cibles en P1)
-- est donc toujours un update, jamais un insert-puis-update. meal_slots
-- n'est volontairement pas seedé ici (voir commentaire en tête de fichier).
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
  insert into public.nutrition_targets (id) values (new.id);
  return new;
end;
$$;

-- Backfill pour les comptes déjà existants (le trigger ne couvre que les
-- inscriptions futures), même geste que 20260808153000_backfill_coaching_profile.sql.
insert into public.nutrition_targets (id)
select id from auth.users
on conflict (id) do nothing;
