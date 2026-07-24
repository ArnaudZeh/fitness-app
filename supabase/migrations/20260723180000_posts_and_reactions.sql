-- P9d — Posts (texte libre + photo optionnelle), likes et commentaires sur
-- tout le feed (jalons + posts). Remplace progress_photos : l'ancien flux
-- "ajouter une photo" devient un post avec une photo attachée et un texte
-- optionnel, plutôt que deux concepts parallèles dans le feed.
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  content text,
  storage_path text unique,
  created_at timestamptz not null default now(),
  constraint posts_content_or_photo check (content is not null or storage_path is not null)
);

alter table public.posts enable row level security;

create policy "Users can view their own posts and opted-in others'"
  on public.posts for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.profiles p
      where p.id = posts.user_id and p.social_sharing_enabled
    )
  );

create policy "Users can insert their own posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = user_id);

create index posts_created_at_idx on public.posts (created_at desc);

-- Reprend les données de progress_photos (caption -> content, même
-- storage_path donc même fichier Storage, pas de re-upload) avant de
-- supprimer l'ancienne table. photo_date (backdatage manuel) n'a pas
-- d'équivalent sur un post : created_at devient la seule date affichée,
-- cohérent avec la sémantique "post" (date de publication, pas un album).
insert into public.posts (id, user_id, content, storage_path, created_at)
select id, user_id, caption, storage_path, created_at
from public.progress_photos;

drop table public.progress_photos;

-- Vérifie qu'un target (jalon ou post) est visible par l'utilisateur
-- courant, avant d'autoriser une lecture/écriture de like ou commentaire
-- dessus. security definer + logique de visibilité dupliquée ici plutôt
-- que de dépendre de RLS sur milestones/posts (même convention que
-- detect_one_rep_max_milestone / on_program_activated).
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
          or exists (select 1 from public.profiles p where p.id = m.user_id and p.social_sharing_enabled)
        )
    )
    when 'post' then exists (
      select 1 from public.posts po
      where po.id = p_target_id
        and (
          po.user_id = auth.uid()
          or exists (select 1 from public.profiles p where p.id = po.user_id and p.social_sharing_enabled)
        )
    )
    else false
  end
$$;

-- Pas de FK target_id -> milestones/posts : target_type/target_id est
-- polymorphe (deux tables cible possibles), une vraie FK ne peut pointer
-- que vers une seule table. Le nettoyage à la suppression passe par un
-- trigger (cleanup_feed_reactions ci-dessous) plutôt que par ON DELETE
-- CASCADE.
create table public.feed_likes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('milestone', 'post')),
  target_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, target_type, target_id)
);

alter table public.feed_likes enable row level security;

create policy "Users can view likes on visible targets"
  on public.feed_likes for select
  to authenticated
  using (public.can_view_feed_target(target_type, target_id));

create policy "Users can like visible targets"
  on public.feed_likes for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_feed_target(target_type, target_id));

create policy "Users can remove their own likes"
  on public.feed_likes for delete
  to authenticated
  using (auth.uid() = user_id);

create index feed_likes_target_idx on public.feed_likes (target_type, target_id);

create table public.feed_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  target_type text not null check (target_type in ('milestone', 'post')),
  target_id uuid not null,
  content text not null check (char_length(trim(content)) > 0),
  created_at timestamptz not null default now()
);

alter table public.feed_comments enable row level security;

create policy "Users can view comments on visible targets"
  on public.feed_comments for select
  to authenticated
  using (public.can_view_feed_target(target_type, target_id));

create policy "Users can comment on visible targets"
  on public.feed_comments for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_view_feed_target(target_type, target_id));

create policy "Users can delete their own comments"
  on public.feed_comments for delete
  to authenticated
  using (auth.uid() = user_id);

create index feed_comments_target_idx on public.feed_comments (target_type, target_id, created_at);

create or replace function public.cleanup_feed_reactions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_target_type text := TG_ARGV[0];
begin
  delete from public.feed_likes where target_type = v_target_type and target_id = old.id;
  delete from public.feed_comments where target_type = v_target_type and target_id = old.id;
  return old;
end;
$$;

create trigger milestones_cleanup_reactions
  before delete on public.milestones
  for each row execute function public.cleanup_feed_reactions('milestone');

create trigger posts_cleanup_reactions
  before delete on public.posts
  for each row execute function public.cleanup_feed_reactions('post');
