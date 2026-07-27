-- P9e — Notifie l'auteur d'un post/jalon quand un ami like ou commente (les
-- mentions ont déjà leur propre pastille depuis feed_mentions ; ceci couvre
-- le reste des interactions sociales avec le même mécanisme de badge).
--
-- Table séparée plutôt qu'extension de feed_mentions : feed_mentions sert
-- aussi à localiser "@Nom" dans le texte à l'affichage (une préoccupation
-- de rendu, pas juste de notification) — mélanger les deux aurait forcé
-- like/commentaire à porter des colonnes de rendu qui ne les concernent
-- pas.
create table public.feed_activity_notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  actor_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('like', 'comment')),
  content_type text not null check (content_type in ('post', 'milestone')),
  content_id uuid not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint feed_activity_notifications_no_self check (actor_id <> recipient_id)
);

alter table public.feed_activity_notifications enable row level security;

-- Résout le propriétaire réel d'un post/jalon — sert à vérifier côté RLS
-- que recipient_id n'est pas une valeur inventée par le client (contrairement
-- à can_view_feed_target qui répond "auth.uid() peut-il voir ceci ?", celle-ci
-- répond "qui est le propriétaire ?", nécessaire ici puisque l'acteur n'est
-- pas le propriétaire par définition).
create or replace function public.feed_target_owner(p_content_type text, p_content_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select case p_content_type
    when 'milestone' then (select m.user_id from public.milestones m where m.id = p_content_id)
    when 'post' then (select po.user_id from public.posts po where po.id = p_content_id)
    else null
  end
$$;

create policy "Recipients can view their own activity notifications"
  on public.feed_activity_notifications for select
  to authenticated
  using (auth.uid() = recipient_id);

-- Un acteur ne peut créer une notification que vers le vrai propriétaire du
-- contenu concerné (pas un destinataire arbitraire), et seulement vers un
-- contenu qu'il a le droit de voir (can_view_feed_target — il faut déjà
-- pouvoir liker/commenter ce contenu pour générer l'événement).
create policy "Actors can notify the real content owner"
  on public.feed_activity_notifications for insert
  to authenticated
  with check (
    auth.uid() = actor_id
    and public.can_view_feed_target(content_type, content_id)
    and public.feed_target_owner(content_type, content_id) = recipient_id
  );

-- Marquer comme lue en consultant le Feed — seul le destinataire, et
-- seulement non-lue -> lue (même convention que feed_mentions).
create policy "Recipients can mark their activity notifications read"
  on public.feed_activity_notifications for update
  to authenticated
  using (auth.uid() = recipient_id)
  with check (auth.uid() = recipient_id);

create index feed_activity_notifications_unread_idx
  on public.feed_activity_notifications (recipient_id) where read_at is null;
create index feed_activity_notifications_content_idx
  on public.feed_activity_notifications (content_type, content_id);

-- Étend le nettoyage existant (cleanup_feed_reactions, migration
-- 20260723180000) pour couvrir aussi les notifications d'un post/jalon
-- supprimé — même trigger, un argument de plus à gérer.
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
  delete from public.feed_activity_notifications where content_type = v_target_type and content_id = old.id;
  return old;
end;
$$;
