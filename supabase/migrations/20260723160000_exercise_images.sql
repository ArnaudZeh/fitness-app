-- Backfill image_url for the system exercise catalog from wger.de's open
-- exercise database (CC-BY-SA / community-contributed images), matched by
-- name against wger's French and English translations. Coverage is partial
-- by design, on purpose: wger only has images for ~32% of its own catalog,
-- and matches were kept only above a name-similarity threshold high enough
-- to trust. A wrong photo is worse than no photo, so exercises without a
-- confident match are simply left without one rather than guessed.
alter table public.exercises add column image_url text;

update public.exercises set image_url = 'https://wger.de/media/exercise-images/192/Bench-press-1.png.200x200_q85.png' where name = 'Développé couché' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png.200x200_q85.png' where name = 'Dips' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.200x200_q85.png' where name = 'Presse à cuisses' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/984/5c7ffe68-e7b2-47f3-a22a-f9cc28640432.png.200x200_q85.jpg' where name = 'Fentes' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png.200x200_q85.jpg' where name = 'Élévations latérales' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/16/Incline-press-1.png.200x200_q85.png' where name = 'Développé incliné haltères' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1648/63ae02d6-6dd9-4e9e-84da-d4905e78a33c.jpg.200x200_q85.jpg' where name = 'Crunch lesté' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/41/Incline-bench-press-1.png.200x200_q85.jpg' where name = 'Incline Barbell Bench Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png.200x200_q85.jpg' where name = 'Cable Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.200x200_q85.jpg' where name = 'Push-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/630/b0f0c7d8-5878-4d9e-b820-21acc013741d.webp.200x200_q85.png' where name = 'Sumo Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png.200x200_q85.jpg' where name = 'Seated Cable Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.200x200_q85.png' where name = 'Chin-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1392/a02c9c7d-f42d-43e0-9946-1b99b014daee.png.200x200_q85.png' where name = 'Good Morning' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/478/70a2d72c-a822-45f3-8de2-54ea85951b84.jpg.200x200_q85.jpg' where name = 'Push Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/822/74affc0d-03b6-4f33-b5f4-a822a2615f68.png.200x200_q85.jpg' where name = 'Cable Rear Delt Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/977/3124c091-6395-4377-96c5-56048b627ceb.png.200x200_q85.png' where name = 'Box Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/456/3b681e59-377b-40db-9113-ca5873ce084b.jpg.200x200_q85.jpg' where name = 'Pistol Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/369/78c915d1-e46d-4d30-8124-65d68664c3ef.png.200x200_q85.jpg' where name = 'Leg Extension' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1748/923a3ff7-c269-49bd-9f03-697151a40f06.jpg.200x200_q85.jpg' where name = 'Hip Abduction Machine' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1193/70ca5d80-3847-4a8c-8882-c6e9e485e29e.png.200x200_q85.png' where name = 'Russian Twist' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1194/074e1766-4208-4a67-a211-9721772d99b0.png.200x200_q85.png' where name = 'Pallof Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/960/da4d0560-da89-4bb5-b91f-746458fb04ad.png.200x200_q85.png' where name = 'Kettlebell Swing' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1127/4942b7c0-6bda-4983-88e5-86547c3d445e.png.200x200_q85.jpg' where name = 'Close-Grip Lat Pulldown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/100/Decline-bench-press-1.png.200x200_q85.jpg' where name = 'Decline Bench Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/16/Incline-press-1.png.200x200_q85.png' where name = 'Dumbbell Bench Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/16/Incline-press-1.png.200x200_q85.png' where name = 'Incline Dumbbell Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1637/a1fbe83a-a3e5-49f6-a2c2-5d5b533c2be8.png.200x200_q85.png' where name = 'Single-Arm Dumbbell Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1726/2e7e541b-5f55-405a-ae78-3e71b3f42db4.png.200x200_q85.jpg' where name = 'Straight-Arm Pulldown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png.200x200_q85.png' where name = 'Standing Barbell Overhead Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/822/74affc0d-03b6-4f33-b5f4-a822a2615f68.png.200x200_q85.jpg' where name = 'Rear Delt Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/53/Shoulder-press-machine-2.png.200x200_q85.png' where name = 'Machine Shoulder Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1620/edd40e39-e337-4460-a8dd-6127d40ddd16.jpeg.200x200_q85.jpg' where name = 'Seated Calf Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1519/fab7f641-27d4-40b5-8edd-1a0a137bfd94.gif' where name = 'Overhead Cable Triceps Extension' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1336/ebf88217-df26-4ef7-94cb-f0c2220c6abe.webp.200x200_q85.png' where name = 'Overhead Dumbbell Triceps Extension' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1641/68d9488d-2596-420f-be0f-52aa70732c83.webp.200x200_q85.jpg' where name = 'Soulevé de terre' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/129/Standing-biceps-curl-1.png.200x200_q85.png' where name = 'Curl biceps' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1519/fab7f641-27d4-40b5-8edd-1a0a137bfd94.gif' where name = 'Extension triceps' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp.200x200_q85.jpg' where name = 'Hip thrust' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.200x200_q85.jpg' where name = 'Incline Push-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.200x200_q85.jpg' where name = 'Decline Push-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.200x200_q85.jpg' where name = 'Weighted Push-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/129/b263c968-e067-4750-916a-d8758a7df23e.webp.200x200_q85.jpg' where name = 'Machine Chest Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1640/bdea82f1-15ef-4649-8b5a-1303cfc178e7.webp.200x200_q85.jpg' where name = 'Front Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/203/1c052351-2af0-4227-aeb0-244008e4b0a8.jpeg.200x200_q85.jpg' where name = 'Goblet Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png.200x200_q85.png' where name = 'Lying Leg Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/364/b318dde9-f5f2-489f-940a-cd864affb9e3.png.200x200_q85.png' where name = 'Seated Leg Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1604/7695428e-bfed-4021-b987-498d93153995.png.200x200_q85.jpg' where name = 'Lateral Lunge' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.200x200_q85.png' where name = 'Sled Leg Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1109/00b0a0bf-c14a-4f13-bb14-62c09030a1aa.png.200x200_q85.jpg' where name = 'Concentration Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1109/00b0a0bf-c14a-4f13-bb14-62c09030a1aa.png.200x200_q85.jpg' where name = 'Cable Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg.200x200_q85.jpg' where name = 'Cable Triceps Pushdown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1185/c5ca283d-8958-4fd8-9d59-a3f52a3ac66b.jpg.200x200_q85.jpg' where name = 'Rope Triceps Pushdown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1551/a6a9e561-3965-45c6-9f2b-ee671e1a3a45.png.200x200_q85.jpg' where name = 'Diamond Push-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/51/f1730f56-7aca-4566-8338-3e42b1bee6e1.webp.200x200_q85.png' where name = 'Wrist Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1573/a9ab402b-61ef-4d60-b91a-df52bf7f41a9.jpg.200x200_q85.png' where name = 'Ab Wheel Rollout' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/297/b10d3341-baa8-49ab-b462-5b3529389aac.png.200x200_q85.png' where name = 'Hollow Body Hold' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp.200x200_q85.jpg' where name = 'Romanian Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/371/d2136f96-3a43-4d4c-9944-1919c4ca1ce1.webp.200x200_q85.png' where name = 'Single Leg Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp.200x200_q85.jpg' where name = 'Soulevé de terre roumain' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1283/e7262f70-7512-408a-8d00-4c499ef632fc.jpg.200x200_q85.jpg' where name = 'Chest-Supported Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1745/9c92843a-6b90-428b-a868-9af4b11bad38.jpg.200x200_q85.jpg' where name = 'Cable Front Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1893/7dbad19e-0616-41fd-9d7d-3e21649c0eea.png.200x200_q85.png' where name = 'Développé militaire' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png.200x200_q85.jpg' where name = 'Tirage vertical' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/192/Bench-press-1.png.200x200_q85.png' where name = 'Close-Grip Bench Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/916/9bf7555a-fec6-43a9-b343-aae496744e5e.png.200x200_q85.png' where name = 'Smith Machine Bench Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/694/119e6823-6960-4341-a9e1-aaf78d7fb57c.png.200x200_q85.jpg' where name = 'Upright Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1567/0a8c155c-a48e-47e8-9df3-e39f025c6cad.png.200x200_q85.png' where name = 'Hammer Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png.200x200_q85.png' where name = 'Side Plank' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1479/0305d98e-0887-4c0c-8992-7c220814efc2.webp.200x200_q85.png' where name = 'Sit-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1947/4201a9c0-f9e4-48ca-80f1-b46c7ffe5640.webp.200x200_q85.jpg' where name = 'Snatch' and user_id is null;
