-- Bug found during manual cross-user verification (throwaway account, real
-- RLS via REST — not superuser SQL, which would have masked this): the
-- original policy's EXISTS subquery checked public.profiles directly, but
-- profiles itself is RLS-restricted to auth.uid() = id — so from any other
-- user's session, that subquery can never see the row it's checking,
-- making the "opted-in" branch permanently false regardless of the actual
-- flag. public_profiles (created without security_invoker, so it runs with
-- the view owner's privileges) is exactly the bypass this needs — reuse it
-- instead of querying profiles directly.
drop policy "Users can view their own milestones and opted-in others'" on public.milestones;

create policy "Users can view their own milestones and opted-in others'"
  on public.milestones for select
  to authenticated
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.public_profiles pp
      where pp.id = milestones.user_id
    )
  );
