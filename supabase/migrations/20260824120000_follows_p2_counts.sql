-- Follow asymétrique — P2 (visibilité sociale), scopé via AskUserQuestion :
-- compteurs seulement pour ce premier tour (pas de liste nominative — un
-- abonné privé qui suit un profil public ne doit pas se retrouver
-- nommé/révélé à des inconnus juste parce qu'il suit quelqu'un ; une vraie
-- liste demanderait de gérer l'anonymisation des abonnés privés, hors
-- scope ici). Exposé via 2 fonctions security definer plutôt qu'en
-- élargissant la policy SELECT de follows elle-même — un compteur agrégé
-- ne réexpose aucune ligne individuelle, donc pas besoin de toucher à la
-- visibilité ligne par ligne posée en P1.
--
-- Visible pour un tiers uniquement si le profil ciblé est public
-- (cohérent avec le reste de FriendProfilePage) ; toujours visible pour
-- soi-même, même privé — on voit toujours ses propres compteurs.
create or replace function public.count_followers(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() = p_user_id or public.is_profile_public(p_user_id)
      then (select count(*)::int from public.follows where followed_id = p_user_id)
    else null
  end
$$;

create or replace function public.count_following(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when auth.uid() = p_user_id or public.is_profile_public(p_user_id)
      then (select count(*)::int from public.follows where follower_id = p_user_id)
    else null
  end
$$;
