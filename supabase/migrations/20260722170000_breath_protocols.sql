-- P7 — Hypoxie intermittente : protocoles configurables (durée d'apnée,
-- durée de récup, nombre de cycles) sauvegardés par l'utilisateur, lancés
-- depuis une page dédiée ou un lien dans le workflow de séance.
create table public.breath_protocols (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  hold_seconds smallint not null check (hold_seconds > 0),
  recovery_seconds smallint not null check (recovery_seconds > 0),
  cycles smallint not null check (cycles > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.breath_protocols enable row level security;

create policy "Users can view their own breath protocols"
  on public.breath_protocols for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own breath protocols"
  on public.breath_protocols for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own breath protocols"
  on public.breath_protocols for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own breath protocols"
  on public.breath_protocols for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_breath_protocols_updated_at
  before update on public.breath_protocols
  for each row execute function public.set_updated_at();

create index breath_protocols_user_id_idx on public.breath_protocols (user_id);

-- Une ligne par run du minuteur, qu'il aille à son terme ou soit arrêté en
-- cours de route — completed_cycles reflète ce qui a réellement été fait
-- (pas nécessairement égal à protocols.cycles), pas d'update possible
-- après coup (comme wellness_activity_logs : un log ne se modifie pas,
-- seulement select/insert/delete).
create table public.breath_session_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  protocol_id uuid not null references public.breath_protocols (id) on delete cascade,
  completed_cycles smallint not null check (completed_cycles >= 0),
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.breath_session_logs enable row level security;

create policy "Users can view their own breath session logs"
  on public.breath_session_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own breath session logs"
  on public.breath_session_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own breath session logs"
  on public.breath_session_logs for delete
  to authenticated
  using (auth.uid() = user_id);

create index breath_session_logs_user_id_completed_at_idx
  on public.breath_session_logs (user_id, completed_at desc);
