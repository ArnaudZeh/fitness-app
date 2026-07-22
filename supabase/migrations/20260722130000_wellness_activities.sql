-- P6a — Planning bien-être quotidien : activités récurrentes (vacuum sous
-- la douche, Wim Hof au réveil, cold plunge...) avec un jour de récurrence
-- fixe par semaine — même modèle que session_templates (jours fixes)
-- plutôt qu'un système de récurrence général (RRULE etc.), cohérent avec
-- le reste du projet et largement suffisant pour ce cas d'usage.
-- reminder_time est déjà présent ici même si les notifications push
-- n'arrivent qu'en P6b, pour éviter une deuxième migration de schéma.
create table public.wellness_activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  days_of_week smallint[] not null default '{}',
  reminder_time time,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint wellness_activities_days_of_week_check check (
    days_of_week <@ array[1, 2, 3, 4, 5, 6, 7]::smallint[]
  )
);

alter table public.wellness_activities enable row level security;

create policy "Users can view their own wellness activities"
  on public.wellness_activities for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own wellness activities"
  on public.wellness_activities for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own wellness activities"
  on public.wellness_activities for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own wellness activities"
  on public.wellness_activities for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_wellness_activities_updated_at
  before update on public.wellness_activities
  for each row execute function public.set_updated_at();

create index wellness_activities_user_id_idx on public.wellness_activities (user_id);

-- Une ligne = l'activité a été cochée "faite" un jour donné. Décocher est
-- un simple delete (pas de colonne "done" à faire basculer) — même esprit
-- que le reste du projet : pas d'état de plus que nécessaire.
create table public.wellness_activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  activity_id uuid not null references public.wellness_activities (id) on delete cascade,
  completed_date date not null default current_date,
  created_at timestamptz not null default now(),
  unique (activity_id, completed_date)
);

alter table public.wellness_activity_logs enable row level security;

create policy "Users can view their own wellness activity logs"
  on public.wellness_activity_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own wellness activity logs"
  on public.wellness_activity_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own wellness activity logs"
  on public.wellness_activity_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create index wellness_activity_logs_user_id_completed_date_idx
  on public.wellness_activity_logs (user_id, completed_date desc);
