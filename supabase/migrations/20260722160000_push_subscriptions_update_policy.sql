-- The client upserts on (endpoint) when re-subscribing the same
-- browser/device (e.g. re-enabling notifications after disabling them) —
-- that ON CONFLICT DO UPDATE path needs an UPDATE policy, which the
-- original push_subscriptions migration omitted.
create policy "Users can update their own push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
