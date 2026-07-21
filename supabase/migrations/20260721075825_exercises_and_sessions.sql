-- P2b: exercise catalog + session templates (weekly day structure within a
-- block) + generated weekly sessions.

-- Exercise catalog: user_id null = shared system catalog (seeded below),
-- non-null = a user's own custom exercise. Same user_id + RLS pattern as
-- every other user-data table, but SELECT also allows the shared rows.
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  name text not null,
  muscle_group text,
  created_at timestamptz not null default now()
);

alter table public.exercises enable row level security;

create policy "Users can view system exercises and their own"
  on public.exercises for select
  to authenticated
  using (user_id is null or auth.uid() = user_id);

create policy "Users can insert their own exercises"
  on public.exercises for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own exercises"
  on public.exercises for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own exercises"
  on public.exercises for delete
  to authenticated
  using (auth.uid() = user_id);

-- Weekly day templates within a block (e.g. "Jour A - Push").
create table public.session_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id uuid not null references public.blocks (id) on delete cascade,
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

create policy "Users can insert session templates into their own blocks"
  on public.session_templates for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.blocks b where b.id = block_id and b.user_id = auth.uid())
  );

create policy "Users can update their own session templates"
  on public.session_templates for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.blocks b where b.id = block_id and b.user_id = auth.uid())
  );

create policy "Users can delete their own session templates"
  on public.session_templates for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_session_templates_updated_at
  before update on public.session_templates
  for each row execute function public.set_updated_at();

create index session_templates_block_id_idx on public.session_templates (block_id);

-- Prescribed exercise slots within a day template (sets/reps/RPE targets).
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

-- One join is enough here (session_templates already validated its own
-- block/program ownership chain at its own insert time).
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

-- Concrete weekly sessions generated from a block's day-template structure.
-- Actual set-by-set logging (P3/P4) will attach to these rows.
create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  block_id uuid not null references public.blocks (id) on delete cascade,
  session_template_id uuid not null references public.session_templates (id) on delete cascade,
  week_number int not null check (week_number > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (block_id, session_template_id, week_number)
);

alter table public.sessions enable row level security;

create policy "Users can view their own sessions"
  on public.sessions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert sessions into their own blocks"
  on public.sessions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.blocks b where b.id = block_id and b.user_id = auth.uid())
  );

create policy "Users can delete their own sessions"
  on public.sessions for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_sessions_updated_at
  before update on public.sessions
  for each row execute function public.set_updated_at();

create index sessions_block_id_idx on public.sessions (block_id);

-- Generates one row in `sessions` per (week x day-template) in a block.
-- security invoker (the default) — runs as the calling user, so it can only
-- ever insert rows that pass the `sessions` RLS insert policy above.
-- Idempotent: re-running after adding a day-template only fills the gaps.
create function public.generate_block_sessions(p_block_id uuid)
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_block public.blocks%rowtype;
  v_template public.session_templates%rowtype;
  v_week integer;
  v_inserted integer := 0;
begin
  select * into v_block from public.blocks where id = p_block_id;
  if not found then
    raise exception 'Block not found or not accessible';
  end if;

  for v_week in 1..v_block.duration_weeks loop
    for v_template in
      select * from public.session_templates
      where block_id = p_block_id
      order by order_index
    loop
      insert into public.sessions (user_id, block_id, session_template_id, week_number)
      values (v_block.user_id, p_block_id, v_template.id, v_week)
      on conflict (block_id, session_template_id, week_number) do nothing;
      if found then
        v_inserted := v_inserted + 1;
      end if;
    end loop;
  end loop;

  return v_inserted;
end;
$$;

-- Seed a starter system exercise catalog (user_id null = shared, read-only
-- to users via the SELECT policy above).
insert into public.exercises (name, muscle_group) values
  ('Squat', 'jambes'),
  ('Développé couché', 'pectoraux'),
  ('Soulevé de terre', 'dos'),
  ('Développé militaire', 'épaules'),
  ('Rowing barre', 'dos'),
  ('Traction', 'dos'),
  ('Dips', 'pectoraux'),
  ('Presse à cuisses', 'jambes'),
  ('Fentes', 'jambes'),
  ('Soulevé de terre roumain', 'jambes'),
  ('Curl biceps', 'bras'),
  ('Extension triceps', 'bras'),
  ('Élévations latérales', 'épaules'),
  ('Face pull', 'épaules'),
  ('Mollets debout', 'jambes'),
  ('Gainage (planche)', 'core'),
  ('Hip thrust', 'jambes'),
  ('Tirage vertical', 'dos'),
  ('Développé incliné haltères', 'pectoraux'),
  ('Crunch lesté', 'core');
