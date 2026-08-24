-- Follow asymétrique — P3 (suggestions de comptes publics à découvrir).
--
-- Bug préexistant trouvé en concevant P3, corrigé au passage : la policy
-- select du bucket 'avatars' n'a jamais eu de branche "profil simplement
-- public" — seulement soi-même, ami, ou suivi+public (P1). Or parcourir
-- le profil public de quelqu'un (via /friends/:id, fonctionnalité de
-- juillet) affiche déjà son programme actif et ses pesées à n'importe qui
-- d'authentifié sans exiger d'être ami ni de le suivre — son avatar aurait
-- dû suivre la même règle depuis le début et ne l'a jamais fait. Ça
-- devient visible maintenant : une suggestion de suivi est par
-- construction un compte public pas encore suivi, donc systématiquement
-- dans le cas resté cassé.
drop policy "Users can view their own avatar and friends' and followed public" on storage.objects;
create policy "Users can view own avatar, friends, followed, or public"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or public.is_followed_and_public(auth.uid(), ((storage.foldername(name))[1])::uuid)
      or public.is_profile_public(((storage.foldername(name))[1])::uuid)
    )
  );

-- Suggestions : profils publics, pas soi-même, pas déjà suivi, pas déjà
-- ami (le suivre n'apporterait rien puisque son contenu est déjà visible
-- via l'amitié). Classées par nombre d'abonnés — signal simple de "compte
-- public actif", pas de recommandation par affinité pour ce premier tour.
create or replace function public.get_follow_suggestions(p_limit integer default 10)
returns table(id uuid, display_name text, follower_count integer)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p.id,
    p.display_name,
    (select count(*)::int from public.follows f where f.followed_id = p.id) as follower_count
  from public.profiles p
  where p.is_public
    and p.id <> auth.uid()
    and not exists (
      select 1 from public.follows f
      where f.follower_id = auth.uid() and f.followed_id = p.id
    )
    and not public.are_friends(auth.uid(), p.id)
  order by follower_count desc, p.id
  limit p_limit
$$;
