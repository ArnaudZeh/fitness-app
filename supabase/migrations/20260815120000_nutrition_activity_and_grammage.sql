-- Two fixes to the nutrition module driven by real usage (see TODOS.md
-- "Nutrition — retours P1 : activité en 2 facteurs + grammage").
--
-- 1) activity_level was a single 5-way PAL category blending "daily/job
-- activity" and "structured training volume" into one guess — breaks down
-- for a desk job + serious training schedule (the exact case that
-- surfaced this). Narrowed to 3 values representing daily/occupational
-- activity ONLY ("NEAT hors sport") ; training volume is now derived from
-- actually-logged sessions instead of being self-declared (see
-- src/lib/nutrition-calc.ts / src/lib/training-frequency-api.ts), so it's
-- always current without another field to keep in sync.
alter table public.nutrition_targets
  drop constraint nutrition_targets_activity_level_check;

alter table public.nutrition_targets
  add constraint nutrition_targets_activity_level_check
  check (activity_level in ('sedentaire', 'modere', 'physique'));

-- 2) Manual food logging asked for calories/macros as an absolute total
-- per entry — tedious to compute in your head from a nutrition label,
-- which is always printed per 100g. quantity_g + the *_per_100g columns
-- store what the user actually types (a per-100g reference, matching
-- nutrition labels and the shape P2's OpenFoodFacts data will arrive in);
-- calories/protein_g/carbs_g/fat_g stay the computed totals for the
-- logged quantity, unchanged in meaning from P1. All nullable — a future
-- quick-add/import path that only has the total (no per-100g reference)
-- can still populate just the total columns.
alter table public.food_logs
  add column quantity_g numeric(7, 1) check (quantity_g > 0),
  add column calories_per_100g numeric(7, 1) check (calories_per_100g >= 0),
  add column protein_g_per_100g numeric(6, 1) check (protein_g_per_100g >= 0),
  add column carbs_g_per_100g numeric(6, 1) check (carbs_g_per_100g >= 0),
  add column fat_g_per_100g numeric(6, 1) check (fat_g_per_100g >= 0);
