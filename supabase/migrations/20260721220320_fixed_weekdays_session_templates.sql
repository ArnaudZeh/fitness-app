-- Replace free-form "add a day" with a fixed Monday-Sunday structure per
-- program. Each program always has exactly 7 session_templates rows (one
-- per ISO weekday, 1=Monday..7=Sunday), each marked 'training' or 'rest'.
-- Users no longer create/name/delete/reorder days — they just flip a day's
-- type. New programs get their 7 days auto-created by a trigger, same
-- pattern as handle_new_user() in P0.

alter table public.session_templates
  add column day_of_week int,
  add column day_type text;

-- Backfill existing rows: preserve their relative order as their weekday,
-- and mark them 'training' (the only way a row could exist before was if
-- a user manually created it — i.e. it was meant to be worked).
update public.session_templates st
set day_of_week = sub.rn,
    day_type = 'training'
from (
  select id, row_number() over (partition by program_id order by order_index) as rn
  from public.session_templates
) sub
where st.id = sub.id;

-- `name`/`order_index` are dropped further below, but the backfill insert
-- just below doesn't set them — relax their NOT NULL constraints first so
-- that insert doesn't fail.
alter table public.session_templates
  alter column name drop not null,
  alter column order_index drop not null;

-- Backfill the remaining weekdays (as 'rest') for every program that
-- already has at least one session_template, so every program ends up
-- with all 7 days.
insert into public.session_templates (user_id, program_id, day_of_week, day_type)
select p.user_id, p.id, d.day_of_week, 'rest'
from public.programs p
cross join (select generate_series(1, 7) as day_of_week) d
where not exists (
  select 1 from public.session_templates st
  where st.program_id = p.id and st.day_of_week = d.day_of_week
);

alter table public.session_templates
  alter column day_of_week set not null,
  alter column day_type set not null,
  alter column day_type set default 'rest',
  add constraint session_templates_day_of_week_check check (day_of_week between 1 and 7),
  add constraint session_templates_day_type_check check (day_type in ('training', 'rest')),
  add constraint session_templates_program_day_unique unique (program_id, day_of_week),
  drop column name,
  drop column order_index;

-- Auto-create the 7 weekday rows whenever a program is created.
-- security definer: bypasses RLS to insert on the new program's behalf,
-- same reasoning as handle_new_user() — the programs insert already
-- passed its own RLS check for this user.
create function public.handle_new_program()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.session_templates (user_id, program_id, day_of_week, day_type)
  select new.user_id, new.id, d, 'rest'
  from generate_series(1, 7) as d;
  return new;
end;
$$;

create trigger on_program_created
  after insert on public.programs
  for each row execute function public.handle_new_program();

-- Users only ever toggle a day's type now (read + update) — inserting or
-- deleting a day would break the "always exactly 7 days" invariant, so
-- those capabilities are removed rather than left unused.
drop policy if exists "Users can insert session templates into their own programs" on public.session_templates;
drop policy if exists "Users can delete their own session templates" on public.session_templates;
