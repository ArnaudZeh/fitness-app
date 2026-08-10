-- Bug : ouvrir le détail d'un programme d'ami/public (/programs/:id) plantait
-- l'app entière (écran noir, redémarrage nécessaire). Cause : le fetch de
-- session_template_exercises embarque exercise:exercises(...) via PostgREST,
-- mais la policy SELECT sur `exercises` restait limitée aux exercices
-- système (user_id null) et aux siens — jamais élargie quand
-- 20260728202200_public_profiles.sql a ouvert programs/session_templates/
-- session_template_exercises à un ami ou à un profil public. Pour un
-- exercice personnalisé créé par le propriétaire du programme consulté,
-- l'embed renvoyait donc `exercise: null`, et le rendu (SlotRow,
-- computeSuggestedMuscleGroupLabel) suppose `exercise` toujours présent —
-- aucun ErrorBoundary dans l'app, donc l'exception plantait tout l'arbre
-- React. Corrige le trou RLS à la source plutôt que de masquer le symptôme
-- côté front.
create or replace function public.can_view_exercise(p_exercise_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.session_template_exercises ste
    where ste.exercise_id = p_exercise_id
      and public.can_view_session_template(ste.session_template_id)
  )
$$;

drop policy "Users can view system exercises and their own" on public.exercises;
create policy "Users can view system exercises, their own and visible programs'"
  on public.exercises for select
  to authenticated
  using (
    user_id is null
    or auth.uid() = user_id
    or public.can_view_exercise(id)
  );
