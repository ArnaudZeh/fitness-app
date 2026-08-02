-- Chrono de repos fiable même écran verrouillé. Le décompte affiché reste
-- un timer JS local (voir RestTimer.tsx) : les navigateurs throttlent/
-- suspendent setTimeout quand l'écran se verrouille, donc le bip/vibration
-- local ne se déclenche pas de façon fiable dans ce cas. Le client
-- programme ici un envoi futur ; un cron (voir migration suivante) réclame
-- et envoie les lignes dues via send-rest-timer-notifications, comme
-- wellness_reminder_sends le fait déjà pour les rappels bien-être.
--
-- session_log_set_id n'a pas de FK vers session_log_sets : l'app est
-- offline-first (Dexie + sync queue, voir session-logs-api.ts) et l'id de
-- la série est généré côté client avant sa synchronisation Postgres — une
-- FK stricte ferait échouer l'insertion si la série n'a pas encore
-- synchronisé au moment où le repos démarre. C'est un simple id de
-- corrélation pour permettre au client de reprogrammer/annuler l'envoi.
create table public.rest_timer_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_log_set_id uuid not null,
  fire_at timestamptz not null,
  sent boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_log_set_id)
);

alter table public.rest_timer_notifications enable row level security;

create policy "Users can view their own rest timer notifications"
  on public.rest_timer_notifications for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own rest timer notifications"
  on public.rest_timer_notifications for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own rest timer notifications"
  on public.rest_timer_notifications for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own rest timer notifications"
  on public.rest_timer_notifications for delete
  to authenticated
  using (auth.uid() = user_id);

-- Le cron ne lit que les lignes non envoyées, triées par échéance.
create index rest_timer_notifications_due_idx
  on public.rest_timer_notifications (fire_at)
  where sent = false;
