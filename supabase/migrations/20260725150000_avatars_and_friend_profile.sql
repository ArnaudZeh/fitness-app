-- Photo de profil + consultation du profil d'un ami dans les grandes
-- lignes (2026-07-25) : âge, prénom, photo, objectif, dernières pesées,
-- programme en cours.

alter table public.profiles add column avatar_path text;

-- Deuxième bucket Storage du projet (après progress-photos, migration
-- 20260723130000) — même convention (privé, URL signée générée côté
-- client), mais chemin fixe "<user_id>/avatar.jpg" plutôt qu'un fichier par
-- upload : un seul avatar par personne, un ré-upload écrase le précédent
-- (upsert), pas de nettoyage de l'ancien fichier à gérer séparément.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  false,
  2097152, -- 2 Mo — bien au-dessus de ce que vise la compression client (512px)
  array['image/jpeg', 'image/png', 'image/webp']
);

create policy "Users can upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Upsert (ré-upload sur le même chemin) passe par une policy update, pas
-- juste insert, contrairement à progress-photos où chaque photo a un
-- chemin unique et n'est donc jamais mise à jour sur place.
create policy "Users can replace their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Users can view their own avatar and friends'"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'avatars'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.are_friends(auth.uid(), ((storage.foldername(name))[1])::uuid)
    )
  );

create policy "Users can delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Programmes : les amis ne voient que le programme actif (pas les
-- brouillons/archives, pas "grandes lignes") — au plus un programme actif
-- par personne (migration 20260723150000_single_active_program.sql), donc
-- une seule ligne à afficher côté client.
drop policy "Users can view their own programs" on public.programs;
create policy "Users can view their own programs and friends' active one"
  on public.programs for select
  to authenticated
  using (
    auth.uid() = user_id
    or (status = 'active' and public.are_friends(auth.uid(), user_id))
  );

-- Pesées : mêmes amis qui voient déjà les jalons de poids atteint dans le
-- feed, donc pas d'info nouvelle exposée en substance — le client ne
-- récupère que les toutes dernières entrées (limit côté requête, pas ici).
drop policy "Users can view their own weight entries" on public.weight_entries;
create policy "Users can view their own weight entries and friends'"
  on public.weight_entries for select
  to authenticated
  using (auth.uid() = user_id or public.are_friends(auth.uid(), user_id));

-- Vue dédiée (plutôt qu'étendre la RLS de `profiles` directement) : un ami
-- ne doit voir qu'un résumé "grandes lignes", pas la date de naissance
-- exacte (juste l'âge calculé) ni les autres champs (sexe, taille, poids
-- cible, réglages). Même mécanisme que `public_profiles` (pas de
-- security_invoker, la vue tourne avec les droits du propriétaire pour
-- contourner la RLS restrictive de `profiles`, mais se limite elle-même via
-- son propre WHERE sur auth.uid()/are_friends()).
create view public.friend_profile_details as
select
  id,
  display_name,
  avatar_path,
  goal,
  case
    when date_of_birth is null then null
    else extract(year from age(current_date, date_of_birth))::int
  end as age
from public.profiles
where id = auth.uid() or public.are_friends(auth.uid(), id);

grant select on public.friend_profile_details to authenticated;
