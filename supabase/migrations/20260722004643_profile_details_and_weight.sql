-- Profile phase: extend the existing profiles table (P0) with biometrics
-- and a training goal, rather than a separate table — it's already 1-to-1
-- with the user, already has RLS + the handle_new_user() auto-create
-- trigger. All new columns are nullable: filling in the profile is optional,
-- not a blocking onboarding gate.

alter table public.profiles
  add column date_of_birth date,
  add column sex text check (sex in ('homme', 'femme', 'autre')),
  add column height_cm smallint check (height_cm > 0),
  add column goal text check (
    goal in ('perte_de_poids', 'prise_de_muscle', 'recomposition', 'performance', 'maintien')
  ),
  add column target_weight_kg numeric(5, 1) check (target_weight_kg > 0);

-- Weight tracked as a time series (one entry per day) rather than a single
-- profile field — this is what future progress graphs (P5) will read from.
create table public.weight_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  weight_kg numeric(5, 1) not null check (weight_kg > 0),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

alter table public.weight_entries enable row level security;

create policy "Users can view their own weight entries"
  on public.weight_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own weight entries"
  on public.weight_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own weight entries"
  on public.weight_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own weight entries"
  on public.weight_entries for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_weight_entries_updated_at
  before update on public.weight_entries
  for each row execute function public.set_updated_at();

create index weight_entries_user_id_recorded_at_idx
  on public.weight_entries (user_id, recorded_at desc);
