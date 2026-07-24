-- Simplification du feed social, à la demande du user : l'app n'est
-- partagée qu'à un cercle fermé d'amis (via un lien privé, pas un
-- réseau ouvert), donc l'opt-in individuel (social_sharing_enabled)
-- n'apporte rien de plus qu'une friction inutile — tout le monde doit
-- se voir par défaut. Un vrai système d'ajout d'ami viendra plus tard
-- redéfinir qui voit quoi ; en attendant, visibilité totale entre
-- utilisateurs authentifiés. La colonne profiles.social_sharing_enabled
-- n'est pas supprimée (juste déconnectée des policies et de l'UI) —
-- elle pourra être réutilisée ou proprement retirée quand ce futur
-- système sera conçu, plutôt que de la droper puis la recréer.

-- Toutes les policies "opted-in" en aval passent par cette vue (RLS
-- directement ou via les policies de storage.objects sur le bucket
-- progress-photos) — retirer le filtre ici suffit à les rendre
-- permissives sans avoir à toucher chacune séparément.
create or replace view public.public_profiles as
select id, display_name
from public.profiles;

drop policy "Users can view their own milestones and opted-in others'" on public.milestones;
create policy "Authenticated users can view all milestones"
  on public.milestones for select
  to authenticated
  using (true);

drop policy "Users can view their own posts and opted-in others'" on public.posts;
create policy "Authenticated users can view all posts"
  on public.posts for select
  to authenticated
  using (true);

-- Toujours besoin de vérifier que la cible existe (un like/commentaire ne
-- doit pas pointer vers un id bidon), juste plus la condition d'opt-in.
create or replace function public.can_view_feed_target(p_target_type text, p_target_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select case p_target_type
    when 'milestone' then exists (select 1 from public.milestones m where m.id = p_target_id)
    when 'post' then exists (select 1 from public.posts po where po.id = p_target_id)
    else false
  end
$$;
