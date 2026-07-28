-- P3d: optional target/base load per exercise slot — the weight the user
-- wants to hit for that exercise. Serves as the progressive-overload
-- reference used both while logging a session (pre-fills the first set) and
-- by the AI (program generation, session adaptation, coach chat).
alter table public.session_template_exercises
  add column target_weight_kg numeric check (target_weight_kg >= 0);
