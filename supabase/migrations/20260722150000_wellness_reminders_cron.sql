-- Enables extensions required to invoke the send-wellness-reminders Edge
-- Function on a schedule from within Postgres.
create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Wraps the net.http_post call so the CRON_SECRET never appears in the
-- committed migration text — it's read from Vault (stored out-of-band via
-- vault.create_secret(..., 'cron-invoke-secret')) at execution time, then
-- sent as a custom header the Edge Function checks itself (platform JWT
-- verification is off for that function — see supabase/config.toml — since
-- pg_net has no end-user session JWT to present).
create or replace function public.invoke_send_wellness_reminders()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  cron_secret text;
begin
  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron-invoke-secret';

  perform net.http_post(
    url := 'https://whzbcbgurflsqhznzdse.supabase.co/functions/v1/send-wellness-reminders',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', cron_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_send_wellness_reminders() from public, anon, authenticated;

select cron.schedule(
  'send-wellness-reminders-every-minute',
  '* * * * *',
  $$select public.invoke_send_wellness_reminders();$$
);
