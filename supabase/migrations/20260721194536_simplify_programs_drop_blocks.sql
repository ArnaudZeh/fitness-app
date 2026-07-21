-- Architecture pivot: after seeing the P2a/P2b UI, the user asked to cut the
-- Blocks/periodization layer (accumulation/intensification/réalisation/deload)
-- entirely — see project memory "P2 architecture pivot". `focus` (force/
-- hypertrophie/endurance) moves up from Block to Program. Weekly session
-- pre-generation (`sessions` table + generate_block_sessions()) is cut too —
-- real workout logging belongs to P3 ("Log de séance"), not here.
-- Destructive: acceptable pre-launch, no real user data depends on this shape.

drop function if exists public.generate_block_sessions(uuid);
drop table if exists public.sessions;
drop table if exists public.session_template_exercises;
drop table if exists public.session_templates;
drop table if exists public.blocks;

alter table public.programs
  add column focus text not null default 'hypertrophie'
    check (focus in ('force', 'hypertrophie', 'endurance')),
  drop column version,
  drop column forked_from;

-- Weekly day structure (e.g. "Jour A — Push"), now attached directly to a program.
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  order_index int not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_templates enable row level security;

create policy "Users can view their own session templates"
  on public.session_templates for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert session templates into their own programs"
  on public.session_templates for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.programs p where p.id = program_id and p.user_id = auth.uid())
  );

create policy "Users can update their own session templates"
  on public.session_templates for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.programs p where p.id = program_id and p.user_id = auth.uid())
  );

create policy "Users can delete their own session templates"
  on public.session_templates for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_session_templates_updated_at
  before update on public.session_templates
  for each row execute function public.set_updated_at();

create index session_templates_program_id_idx on public.session_templates (program_id);

-- Prescribed exercise slots within a day template (sets/reps/RPE targets).
-- Same shape as before P2b — only its ancestor chain (via session_templates)
-- changed, so this table is just recreated identically.
create table public.session_template_exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_template_id uuid not null references public.session_templates (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id),
  order_index int not null,
  target_sets int not null check (target_sets > 0),
  target_reps_min int not null check (target_reps_min > 0),
  target_reps_max int not null check (target_reps_max >= target_reps_min),
  target_rpe numeric(3, 1) check (target_rpe between 0 and 10),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.session_template_exercises enable row level security;

create policy "Users can view their own session template exercises"
  on public.session_template_exercises for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert exercises into their own session templates"
  on public.session_template_exercises for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.session_templates st
      where st.id = session_template_id and st.user_id = auth.uid()
    )
  );

create policy "Users can update their own session template exercises"
  on public.session_template_exercises for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.session_templates st
      where st.id = session_template_id and st.user_id = auth.uid()
    )
  );

create policy "Users can delete their own session template exercises"
  on public.session_template_exercises for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_session_template_exercises_updated_at
  before update on public.session_template_exercises
  for each row execute function public.set_updated_at();

create index session_template_exercises_template_id_idx
  on public.session_template_exercises (session_template_id);
