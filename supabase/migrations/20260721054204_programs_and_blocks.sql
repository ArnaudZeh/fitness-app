-- P2a: training programs + periodization blocks.
-- Same pattern as profiles (P0): every table carries its own user_id and RLS
-- scoped to auth.uid(), even though blocks also chain up to programs.

create table public.programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  version int not null default 1,
  forked_from uuid references public.programs (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.programs enable row level security;

create policy "Users can view their own programs"
  on public.programs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert their own programs"
  on public.programs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own programs"
  on public.programs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own programs"
  on public.programs for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_programs_updated_at
  before update on public.programs
  for each row execute function public.set_updated_at();

-- Periodization blocks within a program (accumulation/intensification/realisation/deload).
create table public.blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  program_id uuid not null references public.programs (id) on delete cascade,
  name text not null,
  focus text not null check (focus in ('force', 'hypertrophie', 'endurance')),
  block_type text not null check (block_type in ('accumulation', 'intensification', 'realisation', 'deload')),
  order_index int not null,
  duration_weeks int not null check (duration_weeks > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.blocks enable row level security;

-- select/update/delete only need the row's own user_id — cheap and sufficient,
-- since insert is where cross-user program_id spoofing must be blocked.
create policy "Users can view their own blocks"
  on public.blocks for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert blocks into their own programs"
  on public.blocks for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

create policy "Users can update their own blocks"
  on public.blocks for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.programs p
      where p.id = program_id and p.user_id = auth.uid()
    )
  );

create policy "Users can delete their own blocks"
  on public.blocks for delete
  to authenticated
  using (auth.uid() = user_id);

create trigger set_blocks_updated_at
  before update on public.blocks
  for each row execute function public.set_updated_at();

create index blocks_program_id_idx on public.blocks (program_id);
