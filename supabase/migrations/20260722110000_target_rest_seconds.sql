-- P3b: optional planned rest duration per exercise slot, same optional
-- pattern as target_rpe — used as the rest timer's default during logging.
alter table public.session_template_exercises
  add column target_rest_seconds smallint check (target_rest_seconds > 0);
