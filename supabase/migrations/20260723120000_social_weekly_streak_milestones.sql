-- P9b — deux jalons supplémentaires : tonnage hebdomadaire record et
-- streak de régularité record. week_start ancre l'idempotence pour ces deux
-- types (une semaine ne doit jamais produire deux lignes) — NULL pour
-- one_rep_max, qui n'en a pas besoin (chaque ligne est déjà unique par
-- construction : le trigger n'insère que si la valeur dépasse strictement
-- le record précédent).
alter table public.milestones
  add column week_start date;

-- Index partiels (un par type concerné) plutôt qu'une contrainte unique
-- globale sur (user_id, week_start) — one_rep_max n'a pas de week_start et
-- ne doit pas être limité à une ligne par semaine.
create unique index milestones_weekly_tonnage_user_week_idx
  on public.milestones (user_id, week_start)
  where milestone_type = 'weekly_tonnage';

create unique index milestones_regularity_streak_user_week_idx
  on public.milestones (user_id, week_start)
  where milestone_type = 'regularity_streak';

-- Même bucketing que getIsoWeekStart (src/lib/analytics.ts) : semaine ISO
-- (lundi), calculée sur la date UTC de started_at — date_trunc('week', ...)
-- de Postgres suit déjà la définition ISO 8601 (lundi), donc coïncide
-- exactement avec le calcul client une fois la date normalisée en UTC.
create or replace function public.iso_week_start(p_timestamp timestamptz)
returns date
language sql
immutable
set search_path = ''
as $$
  select date_trunc('week', (p_timestamp at time zone 'utc')::date)::date
$$;

-- Le tonnage de la semaine en cours augmente à mesure que d'autres séries
-- sont loguées — plutôt que de figer la valeur au moment où le seuil est
-- franchi, la ligne est mise à jour (ON CONFLICT) pour refléter le total le
-- plus élevé atteint cette semaine-là, jamais une valeur périmée.
create or replace function public.detect_weekly_tonnage_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_week_start date;
  v_week_tonnage numeric;
  v_prior_max numeric;
begin
  select public.iso_week_start(sl.started_at) into v_week_start
  from public.session_logs sl
  where sl.id = new.session_log_id;

  select sum(s.actual_weight_kg * s.actual_reps) into v_week_tonnage
  from public.session_log_sets s
  join public.session_logs sl on sl.id = s.session_log_id
  where s.user_id = new.user_id
    and public.iso_week_start(sl.started_at) = v_week_start;

  select max(week_totals.total) into v_prior_max
  from (
    select public.iso_week_start(sl.started_at) as wk,
           sum(s.actual_weight_kg * s.actual_reps) as total
    from public.session_log_sets s
    join public.session_logs sl on sl.id = s.session_log_id
    where s.user_id = new.user_id
      and public.iso_week_start(sl.started_at) <> v_week_start
    group by wk
  ) week_totals;

  if v_prior_max is null or v_week_tonnage > v_prior_max then
    insert into public.milestones (user_id, milestone_type, value, week_start, achieved_at)
    values (new.user_id, 'weekly_tonnage', v_week_tonnage, v_week_start, now())
    on conflict (user_id, week_start) where milestone_type = 'weekly_tonnage'
    do update set value = excluded.value, achieved_at = excluded.achieved_at
    where public.milestones.value < excluded.value;
  end if;

  return new;
end;
$$;

create trigger detect_weekly_tonnage_milestone_trigger
  after insert on public.session_log_sets
  for each row execute function public.detect_weekly_tonnage_milestone();

-- Streak = nombre de semaines ISO consécutives avec au moins une série
-- loguée, jusqu'à la semaine la plus récente incluse. Calculé via le
-- classique "gaps and islands" : trié par semaine décroissante,
-- semaine + (rang × 7 jours) reste constant sur une série consécutive de
-- semaines, donc grouper là-dessus isole chaque "île" d'activité. Un
-- streak de 1 seule semaine n'est jamais annoncé (bruit garanti à la
-- toute première semaine d'usage de n'importe quel utilisateur).
create or replace function public.detect_regularity_streak_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_streak int;
  v_latest_week date;
  v_best_other_streak int;
begin
  with active_weeks as (
    select distinct public.iso_week_start(sl.started_at) as week_start
    from public.session_log_sets s
    join public.session_logs sl on sl.id = s.session_log_id
    where s.user_id = new.user_id
  ),
  grouped as (
    select week_start,
           week_start + (row_number() over (order by week_start desc)) * interval '7 days' as grp
    from active_weeks
  ),
  streaks as (
    select grp, count(*)::int as length, max(week_start) as latest_week,
           row_number() over (order by max(week_start) desc) as recency_rank
    from grouped
    group by grp
  )
  select
    max(length) filter (where recency_rank = 1),
    max(latest_week) filter (where recency_rank = 1),
    max(length) filter (where recency_rank > 1)
  into v_current_streak, v_latest_week, v_best_other_streak
  from streaks;

  if v_current_streak >= 2 and (v_best_other_streak is null or v_current_streak > v_best_other_streak) then
    insert into public.milestones (user_id, milestone_type, value, week_start, achieved_at)
    values (new.user_id, 'regularity_streak', v_current_streak, v_latest_week, now())
    on conflict (user_id, week_start) where milestone_type = 'regularity_streak'
    do nothing;
  end if;

  return new;
end;
$$;

create trigger detect_regularity_streak_milestone_trigger
  after insert on public.session_log_sets
  for each row execute function public.detect_regularity_streak_milestone();
