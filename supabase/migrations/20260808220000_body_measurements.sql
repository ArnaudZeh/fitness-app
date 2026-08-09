-- Mensurations : suivi optionnel en série temporelle, même patron que
-- weight_entries (P22004643) — une ligne par jour, upsert par date, une
-- colonne nullable par point de mesure (on peut n'en loguer qu'un seul à
-- la fois). Table séparée de coaching_profile : c'est une donnée qui
-- évolue dans le temps comme le poids, pas une fiche statique.
--
-- Visibilité : réutilise profiles.is_public (are_friends()/is_profile_public(),
-- même mécanisme que weight_entries) plutôt qu'un réglage dédié — décision
-- explicite du 2026-08-08, pour rester simple.
create table public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_at date not null default current_date,
  neck_cm numeric(5, 1) check (neck_cm > 0),
  chest_cm numeric(5, 1) check (chest_cm > 0),
  waist_cm numeric(5, 1) check (waist_cm > 0),
  hips_cm numeric(5, 1) check (hips_cm > 0),
  arm_cm numeric(5, 1) check (arm_cm > 0),
  thigh_cm numeric(5, 1) check (thigh_cm > 0),
  calf_cm numeric(5, 1) check (calf_cm > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

alter table public.body_measurements enable row level security;

create policy "Users can view their own, friends' and public body measurements"
  on public.body_measurements for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
    or public.is_profile_public(user_id)
  );

create policy "Users can insert their own body measurements"
  on public.body_measurements for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own body measurements"
  on public.body_measurements for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own body measurements"
  on public.body_measurements for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_body_measurements_updated_at
  before update on public.body_measurements
  for each row execute function public.set_updated_at();

create index body_measurements_user_id_recorded_at_idx
  on public.body_measurements (user_id, recorded_at desc);
