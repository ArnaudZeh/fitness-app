-- Requested additions to the shared system exercise catalog.
insert into public.exercises (name, muscle_group)
select v.name, v.muscle_group
from (
  values
    ('Romanian Deadlift', 'jambes'),
    ('Single Leg Press', 'jambes')
) as v(name, muscle_group)
on conflict (name) where user_id is null do nothing;
