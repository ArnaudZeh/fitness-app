-- Profil public/privé, à la demande du user (2026-07-28) — le "vrai
-- système" évoqué par 20260724010000_simplify_social_visibility.sql pour
-- profiles.social_sharing_enabled (posée mais jamais branchée depuis).
-- Réutilisée ici comme flag d'ouverture du profil à tout utilisateur
-- authentifié, pas seulement aux amis : programme actif + dernières
-- pesées deviennent visibles, et le programme actif devient copiable dans
-- son propre compte. Un ami garde exactement le même accès qu'aujourd'hui,
-- que le profil visé soit public ou non (public est additif, jamais
-- restrictif). Défaut false — private by default, personne ne s'ouvre
-- involontairement au passage de cette migration.
alter table public.profiles rename column social_sharing_enabled to is_public;

-- Security definer, même raison que are_friends() : la RLS de `profiles`
-- restreint SELECT à auth.uid() = id, donc une policy d'une AUTRE table
-- qui lirait profiles.is_public directement dans un sous-select se
-- heurterait à cette même restriction et ne verrait jamais rien pour
-- quelqu'un d'autre que soi.
create or replace function public.is_profile_public(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select is_public from public.profiles where id = p_user_id), false)
$$;

-- Programme actif : visible à soi, à un ami (inchangé), ou à tout le
-- monde quand le propriétaire est public.
drop policy "Users can view their own programs and friends' active one" on public.programs;
create policy "Users can view their own, friends' and public active programs"
  on public.programs for select
  to authenticated
  using (
    auth.uid() = user_id
    or (status = 'active' and public.are_friends(auth.uid(), user_id))
    or (status = 'active' and public.is_profile_public(user_id))
  );

-- Pesées : même extension.
drop policy "Users can view their own weight entries and friends'" on public.weight_entries;
create policy "Users can view their own, friends' and public weight entries"
  on public.weight_entries for select
  to authenticated
  using (
    auth.uid() = user_id
    or public.are_friends(auth.uid(), user_id)
    or public.is_profile_public(user_id)
  );

-- Résumé de profil (déjà utilisé pour un ami) : s'ouvre aussi à un profil
-- public. Même mécanisme de vue qui contourne la RLS restrictive de
-- `profiles` (pas de security_invoker), se limite elle-même via son WHERE.
create or replace view public.friend_profile_details as
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
where id = auth.uid() or public.are_friends(auth.uid(), id) or is_public;

-- Détail d'un programme (jours + exercices) : aujourd'hui jamais ouvert
-- même à un ami (il ne voit que nom + focus via `programs`) — nécessaire
-- ici uniquement pour permettre la copie complète d'un programme actif
-- public dans son propre compte. Un ami reste sur son accès actuel
-- inchangé (résumé seulement, pas le détail des séances).
create or replace function public.can_view_program_details(p_program_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.programs p
    where p.id = p_program_id
      and (p.user_id = auth.uid() or (p.status = 'active' and public.is_profile_public(p.user_id)))
  )
$$;

create or replace function public.can_view_session_template(p_session_template_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.session_templates st
    where st.id = p_session_template_id
      and (st.user_id = auth.uid() or public.can_view_program_details(st.program_id))
  )
$$;

drop policy "Users can view their own session templates" on public.session_templates;
create policy "Users can view their own and public active program's templates"
  on public.session_templates for select
  to authenticated
  using (auth.uid() = user_id or public.can_view_program_details(program_id));

drop policy "Users can view their own session template exercises" on public.session_template_exercises;
create policy "Users can view their own and public active program's exercises"
  on public.session_template_exercises for select
  to authenticated
  using (auth.uid() = user_id or public.can_view_session_template(session_template_id));
