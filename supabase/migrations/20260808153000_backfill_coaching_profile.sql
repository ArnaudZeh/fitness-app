-- coaching_profile (20260808150000) only auto-populates for users created
-- *after* this migration, via handle_new_user() — every profile that
-- existed before today has no row, which makes fetchCoachingProfile()'s
-- .single() throw "no rows returned" for every existing user, including
-- the real account and both e2e fixtures. One-time backfill, not a trigger
-- change: from here on handle_new_user() already covers new signups.
insert into public.coaching_profile (id)
select id from public.profiles
where id not in (select id from public.coaching_profile);
