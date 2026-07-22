-- P3a: log de séance (mode gym), boucle de base — en ligne pour l'instant.
-- Un session_log est une instance réelle d'un jour de session_templates,
-- démarrée par l'utilisateur ; session_log_sets contient les séries
-- effectivement réalisées, rattachées au slot planifié (session_template_exercises)
-- pour comparer prévu/réalisé. Le mode offline (Dexie + sync queue), le timer
-- de repos, la saisie vocale et le calculateur de plaques sont backlog (P3b/c/d).

create table public.session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  session_template_id uuid not null references public.session_templates (id) on delete cascade,
  status text not null default 'in_progress' check (status in ('in_progress', 'completed')),
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_logs enable row level security;

create policy "Users can view their own session logs"
  on public.session_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own session logs"
  on public.session_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own session logs"
  on public.session_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own session logs"
  on public.session_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_session_logs_updated_at
  before update on public.session_logs
  for each row execute function public.set_updated_at();

create index session_logs_program_id_idx on public.session_logs (program_id, started_at desc);

create table public.session_log_sets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_log_id uuid not null references public.session_logs (id) on delete cascade,
  session_template_exercise_id uuid not null references public.session_template_exercises (id) on delete cascade,
  set_number smallint not null check (set_number > 0),
  actual_reps smallint not null check (actual_reps >= 0),
  actual_weight_kg numeric(6, 2) not null check (actual_weight_kg >= 0),
  actual_rpe numeric(3, 1) check (actual_rpe >= 0 and actual_rpe <= 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (session_log_id, session_template_exercise_id, set_number)
);

alter table public.session_log_sets enable row level security;

create policy "Users can view their own session log sets"
  on public.session_log_sets for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own session log sets"
  on public.session_log_sets for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own session log sets"
  on public.session_log_sets for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own session log sets"
  on public.session_log_sets for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_session_log_sets_updated_at
  before update on public.session_log_sets
  for each row execute function public.set_updated_at();

create index session_log_sets_session_log_id_idx
  on public.session_log_sets (session_log_id, session_template_exercise_id, set_number);
