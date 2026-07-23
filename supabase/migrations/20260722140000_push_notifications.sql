-- P6b — Notifications push PWA pour les rappels du planning bien-être.
--
-- reminder_time (P6a) est une heure locale saisie dans le navigateur, mais
-- le scheduler tourne côté serveur en UTC — sans fuseau horaire stocké, un
-- rappel à 7h partirait à 7h UTC, pas 7h locales. profiles.timezone
-- (identifiant IANA, ex. "Pacific/Tahiti") est auto-détecté et synchronisé
-- côté client (Intl.DateTimeFormat) ; le scheduler l'utilise pour convertir
-- avant de comparer.
alter table public.profiles
  add column timezone text;

-- Un abonnement push par (endpoint) — l'endpoint est déjà unique par
-- device/navigateur/installation de par la Push API elle-même.
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (endpoint)
);

alter table public.push_subscriptions enable row level security;

create policy "Users can view their own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

-- Registre d'envoi purement interne au scheduler (service_role) — pas de
-- policy pour authenticated du tout (RLS refuse par défaut), même
-- raisonnement que l'absence de policy insert sur session_templates : les
-- clients n'ont aucune raison d'y toucher. Empêche un double envoi du même
-- rappel le même jour si le cron chevauche une exécution précédente encore
-- en cours.
create table public.wellness_reminder_sends (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.wellness_activities (id) on delete cascade,
  sent_date date not null,
  created_at timestamptz not null default now(),
  unique (activity_id, sent_date)
);

alter table public.wellness_reminder_sends enable row level security;
