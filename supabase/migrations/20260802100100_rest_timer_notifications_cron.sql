-- Invoque send-rest-timer-notifications toutes les 15s (pg_cron 1.6 accepte
-- un intervalle en texte en plus de la syntaxe cron à 5 champs, qui ne
-- descend pas sous la minute). Un repos dure typiquement 60-180s ; une
-- granularité minute ferait sonner la notif jusqu'à 59s après la fin
-- réelle du repos, ce qui ne réglerait pas le problème de fiabilité signalé.
create or replace function public.invoke_send_rest_timer_notifications()
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
    url := 'https://whzbcbgurflsqhznzdse.supabase.co/functions/v1/send-rest-timer-notifications',
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', cron_secret),
    body := '{}'::jsonb
  );
end;
$$;

revoke all on function public.invoke_send_rest_timer_notifications() from public, anon, authenticated;

select cron.schedule(
  'send-rest-timer-notifications-every-15s',
  '15 seconds',
  $$select public.invoke_send_rest_timer_notifications();$$
);
