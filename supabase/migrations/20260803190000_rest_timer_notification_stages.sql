-- Une vraie animation de compte à rebours seconde par seconde sur l'écran
-- verrouillé n'est pas possible depuis une PWA (pas de Live Activities iOS,
-- pas de notification "chronomètre" Android via l'API Web standard). En
-- complément du Wake Lock côté client (RestTimer.tsx, garde l'écran allumé
-- tant que l'app est au premier plan), on ajoute ici deux paliers
-- intermédiaires ("mi-repos", "encore 10s") en plus de la notif de fin déjà
-- en place — la contrainte d'unicité passe donc de "une notif par série" à
-- "une notif par (série, palier)".
do $$
declare
  single_column_unique_constraint text;
begin
  select conname into single_column_unique_constraint
  from pg_constraint
  where conrelid = 'public.rest_timer_notifications'::regclass
    and contype = 'u'
    and conkey = array[
      (select attnum from pg_attribute
        where attrelid = conrelid and attname = 'session_log_set_id')
    ];

  if single_column_unique_constraint is not null then
    execute format(
      'alter table public.rest_timer_notifications drop constraint %I',
      single_column_unique_constraint
    );
  end if;
end $$;

alter table public.rest_timer_notifications
  add column stage text not null default 'done',
  add constraint rest_timer_notifications_stage_check
    check (stage in ('halfway', 'ending', 'done'));

alter table public.rest_timer_notifications
  add constraint rest_timer_notifications_session_log_set_id_stage_key
    unique (session_log_set_id, stage);
