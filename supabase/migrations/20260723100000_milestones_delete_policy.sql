-- Users can remove their own milestones from the feed (a reasonable
-- product expectation for a social feature — you should be able to take
-- down your own post), and it gives e2e tests a real cleanup path instead
-- of leaving permanent orphaned rows on the fixture account. Detection
-- itself is still exclusively server-side (the trigger) — this only adds
-- delete, insert/update remain absent for authenticated.
create policy "Users can delete their own milestones"
  on public.milestones for delete
  to authenticated
  using (auth.uid() = user_id);
