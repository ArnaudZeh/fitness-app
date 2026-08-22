-- Follow asymétrique — P1 (fondations). Voir TODOS.md pour le plan de
-- phases complet (P1 fondations, P2 visibilité sociale, P3 suggestions,
-- P4 classement) — scopé via AskUserQuestion avant tout code : suivi
-- réservé aux profils publics (le suivi ne fait que remonter dans le feed
-- un contenu déjà consultable par n'importe quel utilisateur authentifié
-- via /friends/:userId, donc aucune nouvelle exposition de données créée
-- par cette table à elle seule).
create table public.follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint follows_no_self check (follower_id <> followed_id),
  constraint follows_unique_pair unique (follower_id, followed_id)
);

alter table public.follows enable row level security;

-- P1 ne montre le suivi qu'à soi-même (ni compteurs ni listes publiques —
-- ça, c'est P2). "Qui je suis" me sert à afficher l'état du bouton
-- suivre/ne plus suivre sur un profil.
create policy "Users can view who they follow"
  on public.follows for select
  to authenticated
  using (auth.uid() = follower_id);

-- Le profil ciblé doit être public au moment de l'insert — revérifié
-- dynamiquement à la lecture (voir is_followed_and_public ci-dessous),
-- pas juste à la création : si le profil redevient privé après coup, le
-- suivi reste enregistré mais cesse de donner accès au feed tant qu'il
-- l'est, sans qu'il soit nécessaire de supprimer la ligne.
create policy "Users can follow public profiles"
  on public.follows for insert
  to authenticated
  with check (
    auth.uid() = follower_id
    and exists (select 1 from public.profiles where id = followed_id and is_public)
  );

create policy "Users can unfollow"
  on public.follows for delete
  to authenticated
  using (auth.uid() = follower_id);

create index follows_follower_idx on public.follows (follower_id);
create index follows_followed_idx on public.follows (followed_id);

-- Security definer (même convention que are_friends()) : appelée depuis
-- les policies RLS d'autres tables où l'appelant n'a pas de droit de
-- lecture direct sur follows/profiles selon le contexte d'évaluation.
create or replace function public.is_followed_and_public(p_follower uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows f
    join public.profiles p on p.id = f.followed_id
    where f.follower_id = p_follower and f.followed_id = p_target and p.is_public
  )
$$;

-- Étend la visibilité du feed (posts/milestones) et des fichiers Storage
-- associés (photos de post, avatar) aux profils publics suivis, en plus
-- des amis — même liste de surfaces qui avait dû être mise à jour lors du
-- passage "ouvert à tous" -> "amis uniquement" en juillet.
drop policy "Users can view their own milestones and friends'" on public.milestones;
create policy "Users can view their own milestones and friends' and followed public"
  on public.milestones for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
    or public.is_followed_and_public(auth.uid(), user_id)
  );

drop policy "Users can view their own posts and friends'" on public.posts;
create policy "Users can view their own posts and friends' and followed public"
  on public.posts for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
    or public.is_followed_and_public(auth.uid(), user_id)
  );

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
        and (
          m.user_id = auth.uid()
          or public.are_friends(auth.uid(), m.user_id)
          or public.is_followed_and_public(auth.uid(), m.user_id)
        )
    )
    when 'post' then exists (
      select 1 from public.posts po
      where po.id = p_target_id
        and (
          po.user_id = auth.uid()
          or public.are_friends(auth.uid(), po.user_id)
          or public.is_followed_and_public(auth.uid(), po.user_id)
        )
    )
    else false
  end
$$;

drop policy "Users can view their own progress photos and friends'" on storage.objects;
create policy "Users can view their own progress photos and friends' and followed public"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'progress-photos'
    and (
      (storage.foldername(name))[1] = (auth.uid())::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or public.is_followed_and_public(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

drop policy "Users can view their own avatar and friends'" on storage.objects;
create policy "Users can view their own avatar and friends' and followed public"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or public.is_followed_and_public(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );
