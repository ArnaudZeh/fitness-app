-- Le front doit savoir si un profil est public pour ne proposer "Voir le
-- programme en détail" que quand can_view_program_details() l'autorisera
-- vraiment (aujourd'hui: owner ou profil public — jamais un simple ami) ;
-- sinon un ami non-public verrait un lien vers une page "Semaine type"
-- totalement vide (session_templates filtré à zéro ligne par sa RLS).
-- Colonne ajoutée en fin de liste : create or replace view exige que les
-- colonnes existantes gardent leur nom/ordre/type, mais autorise d'en
-- ajouter de nouvelles à la suite.
create or replace view public.friend_profile_details as
select
  id,
  display_name,
  avatar_path,
  goal,
  case
    when date_of_birth is null then null
    else extract(year from age(current_date, date_of_birth))::int
  end as age,
  is_public
from public.profiles
where id = auth.uid() or public.are_friends(auth.uid(), id) or is_public;
