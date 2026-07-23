-- Couche IA — étape 5 : assistant conversationnel. Un seul fil par
-- utilisateur pour commencer (pas de table conversations séparée — rien
-- dans le produit n'exige encore du multi-thread, et ce projet préfère un
-- modèle plat qu'une structure anticipée sur un besoin hypothétique).
-- Les propositions structurées (génération de programme, adaptation de
-- séance) sont stockées telles quelles en jsonb pour pouvoir se ré-afficher
-- comme une carte après un rechargement de page, avec applied_at pour
-- savoir si l'utilisateur l'a déjà appliquée (évite une double-application
-- au reload).
create table public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  tool_name text check (tool_name in ('generer_programme', 'adapter_seance')),
  tool_proposal jsonb,
  applied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.assistant_messages enable row level security;

create policy "Users can view their own assistant messages"
  on public.assistant_messages for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own assistant messages"
  on public.assistant_messages for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update policy exists only so the client can stamp applied_at once a
-- proposal card's "Appliquer" button succeeds — nothing else about a
-- message is ever edited after creation.
create policy "Users can update their own assistant messages"
  on public.assistant_messages for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own assistant messages"
  on public.assistant_messages for delete
  to authenticated
  using (auth.uid() = user_id);

create index assistant_messages_user_id_created_at_idx
  on public.assistant_messages (user_id, created_at);
