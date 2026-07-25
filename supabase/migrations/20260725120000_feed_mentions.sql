-- Système de tag @ami sur le feed (2026-07-25) : @mentionner un ami dans un
-- post ou un commentaire le notifie (pastille sur l'icône Feed, qui
-- disparaît une fois le Feed consulté) et fait ressortir son nom en gras
-- pour quiconque peut déjà voir ce post/commentaire.
--
-- Le texte reste du texte brut classique, sans marqueur spécial stocké
-- dedans ("@Nom" tel que tapé) — cette table est la source de vérité
-- structurée sur QUI a été tagué, utilisée à la fois pour la pastille de
-- notification et pour localiser "@Nom" dans le texte à l'affichage, sans
-- avoir à deviner par correspondance de nom côté client.
--
-- content_type/content_id est polymorphe (post ou commentaire), même
-- convention que target_type/target_id sur feed_likes/feed_comments
-- (migration 20260723180000) : pas de vraie FK possible vers deux tables,
-- nettoyage par trigger plutôt que ON DELETE CASCADE.
create table public.feed_mentions (
  id uuid primary key default gen_random_uuid(),
  content_type text not null check (content_type in ('post', 'comment')),
  content_id uuid not null,
  author_id uuid not null references auth.users (id) on delete cascade,
  mentioned_user_id uuid not null references auth.users (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint feed_mentions_no_self check (author_id <> mentioned_user_id),
  unique (content_type, content_id, mentioned_user_id)
);

alter table public.feed_mentions enable row level security;

-- Sert à la fois à afficher "qui a été tagué" (pour quiconque peut déjà
-- voir le post/commentaire — pas une info plus sensible que le texte brut
-- qui contient déjà "@Nom") et, filtré côté client sur mentioned_user_id,
-- à calculer la pastille de notification du destinataire.
create or replace function public.can_view_mention(p_content_type text, p_content_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_content_type
    when 'post' then public.can_view_feed_target('post', p_content_id)
    when 'comment' then exists (
      select 1 from public.feed_comments c
      where c.id = p_content_id and public.can_view_feed_target(c.target_type, c.target_id)
    )
    else false
  end
$$;

create policy "Anyone who can see the content can see its mentions"
  on public.feed_mentions for select
  to authenticated
  using (public.can_view_mention(content_type, content_id));

-- Seul l'auteur du contenu peut créer une mention, et seulement vers un ami
-- (cohérent avec "taguer via @ pour les amis" — pas n'importe quel profil).
create policy "Authors can mention their friends"
  on public.feed_mentions for insert
  to authenticated
  with check (auth.uid() = author_id and public.are_friends(auth.uid(), mentioned_user_id));

-- Marquer comme lue en consultant le Feed — seul le destinataire, et
-- seulement non-lue -> lue (pas l'inverse).
create policy "Recipients can mark their mentions read"
  on public.feed_mentions for update
  to authenticated
  using (auth.uid() = mentioned_user_id)
  with check (auth.uid() = mentioned_user_id);

create index feed_mentions_unread_idx on public.feed_mentions (mentioned_user_id) where read_at is null;
create index feed_mentions_content_idx on public.feed_mentions (content_type, content_id);

-- Étend le nettoyage existant (posts_cleanup_reactions / milestones_cleanup_reactions,
-- migration 20260723180000) pour couvrir aussi les mentions d'un post supprimé.
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
  delete from public.feed_mentions where content_type = v_target_type and content_id = old.id;
  return old;
end;
$$;

-- Un commentaire peut lui-même contenir une mention — nettoyage symétrique
-- à sa suppression (le trigger ci-dessus ne se déclenche que sur
-- milestones/posts, pas sur feed_comments).
create or replace function public.cleanup_comment_mentions()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.feed_mentions where content_type = 'comment' and content_id = old.id;
  return old;
end;
$$;

create trigger comments_cleanup_mentions
  before delete on public.feed_comments
  for each row execute function public.cleanup_comment_mentions();
