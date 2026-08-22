-- Corrige un vrai bug trouvé en testant en direct (pas en relisant le
-- code) : la policy insert de follows et is_followed_and_public()
-- interrogeaient public.profiles directement dans un sous-select. Or la
-- RLS de profiles restreint déjà SELECT à auth.uid() = id — depuis la
-- session du follower, ce sous-select ne voit jamais la ligne du profil
-- ciblé (qui n'est pas la sienne), donc `is_public` semblait toujours
-- absent et l'insert échouait systématiquement en 403, même sur un
-- profil réellement public. Exactement le même piège déjà documenté lors
-- du bug de récursion RLS de juillet (milestones -> profiles) — il existe
-- déjà une fonction security definer pour ça, is_profile_public(),
-- jamais réutilisée ici par erreur.
create or replace function public.is_followed_and_public(p_follower uuid, p_target uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.follows f
    where f.follower_id = p_follower and f.followed_id = p_target
  ) and public.is_profile_public(p_target)
$$;

drop policy "Users can follow public profiles" on public.follows;
create policy "Users can follow public profiles"
  on public.follows for insert
  to authenticated
  with check (auth.uid() = follower_id and public.is_profile_public(followed_id));
