-- Tag exercise slots that belong together as a superset. Exercises within the
-- same session_template sharing the same (non-null) superset_group label are
-- performed back-to-back — a free-text label (e.g. "A") rather than an enum,
-- since a day can have any number of independent superset pairs/trios.
alter table public.session_template_exercises
  add column superset_group text;
