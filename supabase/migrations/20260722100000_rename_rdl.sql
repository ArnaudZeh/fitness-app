-- User wants the RDL abbreviation kept in the name.
update public.exercises
set name = 'Romanian Deadlift (RDL)'
where name = 'Romanian Deadlift' and user_id is null;
