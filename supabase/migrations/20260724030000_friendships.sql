-- Système d'ajout d'ami, à la demande du user (2026-07-24) — explicitement
-- reporté quand le feed avait été ouvert à tout le monde. Décision de scope
-- prise cette fois : le feed redevient restreint aux amis (le sens naturel
-- d'un "ajout d'ami"), modèle demande + acceptation.
--
-- Paire non-ordonnée stockée via deux colonnes générées (user_a/user_b =
-- min/max des deux id) avec une contrainte unique dessus — garantit qu'il
-- ne peut jamais exister deux lignes contradictoires entre les deux mêmes
-- personnes (une demande dans chaque sens, ou une demande + une amitié déjà
-- acceptée), quel que soit qui a envoyé la demande à l'origine.
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  user_a uuid generated always as (least(requester_id, addressee_id)) stored,
  user_b uuid generated always as (greatest(requester_id, addressee_id)) stored,
  created_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_unique_pair unique (user_a, user_b)
);

create index friendships_addressee_pending_idx on public.friendships (addressee_id) where status = 'pending';
create index friendships_requester_idx on public.friendships (requester_id);

alter table public.friendships enable row level security;

create policy "Users can view their own friendships"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can send friend requests"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

-- Seul le destinataire peut faire passer une demande de pending à accepted
-- — l'auteur de la demande ne peut pas s'auto-accepter.
create policy "Addressee can accept a pending request"
  on public.friendships for update
  to authenticated
  using (auth.uid() = addressee_id and status = 'pending')
  with check (status = 'accepted');

-- Sert à la fois pour annuler une demande envoyée, refuser une demande
-- reçue, et retirer un ami — pas de statut "declined" distinct, une
-- demande refusée est simplement supprimée (peut être renvoyée plus tard).
create policy "Either party can remove a friendship or request"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Security definer : appelée depuis les policies RLS d'autres tables
-- (milestones, posts, storage.objects) où l'appelant n'a pas forcément de
-- droit de lecture direct sur la ligne friendships concernée selon le
-- contexte d'évaluation de la policy appelante.
create or replace function public.are_friends(p_user_1 uuid, p_user_2 uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and f.user_a = least(p_user_1, p_user_2)
      and f.user_b = greatest(p_user_1, p_user_2)
  )
$$;

-- Le feed redevient restreint aux amis (retour sur la policy "using(true)"
-- de la migration 20260724010000 — l'ouverture à tout le monde était
-- explicitement un pis-aller en attendant ce système).
drop policy "Authenticated users can view all milestones" on public.milestones;
create policy "Users can view their own milestones and friends'"
  on public.milestones for select
  to authenticated
  using (auth.uid() = user_id or public.are_friends(auth.uid(), user_id));

drop policy "Authenticated users can view all posts" on public.posts;
create policy "Users can view their own posts and friends'"
  on public.posts for select
  to authenticated
  using (auth.uid() = user_id or public.are_friends(auth.uid(), user_id));

create or replace function public.can_view_feed_target(p_target_type text, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'milestone' then exists (
      select 1 from public.milestones m
      where m.id = p_target_id
        and (m.user_id = auth.uid() or public.are_friends(auth.uid(), m.user_id))
    )
    when 'post' then exists (
      select 1 from public.posts po
      where po.id = p_target_id
        and (po.user_id = auth.uid() or public.are_friends(auth.uid(), po.user_id))
    )
    else false
  end
$$;

-- public_profiles reste ouvert à tous (pas de changement) — nécessaire pour
-- pouvoir rechercher et trouver quelqu'un par son nom AVANT de lui envoyer
-- une demande, qui n'est donc pas encore un ami à ce moment-là.

drop policy "Users can view their own progress photos and opted-in others'" on storage.objects;
create policy "Users can view their own progress photos and friends'"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
