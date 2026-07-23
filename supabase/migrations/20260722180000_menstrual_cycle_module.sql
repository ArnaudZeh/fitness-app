-- P8 — Module cycles menstruels : "activable par utilisatrice" (brief) —
-- désactivé par défaut pour tout le monde, un toggle dans le profil le
-- révèle. Volontairement pas de cache offline (Dexie) pour cette table,
-- contrairement au log de séance : contrainte non négociable du brief
-- ("aucune donnée sensible en localStorage non chiffré, notamment sur le
-- module cycles") — lecture directe Supabase à chaque fois plutôt qu'un
-- cache IndexedDB en clair.
alter table public.profiles
  add column cycle_module_enabled boolean not null default false;

-- Une ligne = une date de début de règles. Le calcul de phase (menstruelle/
-- folliculaire/ovulation/lutéale) se fait côté client à partir de
-- l'historique — pas de colonne "phase" stockée, dérivable à tout moment.
create table public.cycle_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  start_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, start_date)
);

alter table public.cycle_entries enable row level security;

create policy "Users can view their own cycle entries"
  on public.cycle_entries for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own cycle entries"
  on public.cycle_entries for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own cycle entries"
  on public.cycle_entries for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own cycle entries"
  on public.cycle_entries for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_cycle_entries_updated_at
  before update on public.cycle_entries
  for each row execute function public.set_updated_at();

create index cycle_entries_user_id_start_date_idx
  on public.cycle_entries (user_id, start_date desc);
