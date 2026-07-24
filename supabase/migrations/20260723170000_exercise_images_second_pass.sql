-- Second pass on the exercise_images backfill (20260723160000): the first
-- pass used a conservative automated token-similarity threshold and left
-- 94 exercises without a photo. This pass manually searched wger.de's
-- dataset (across French/English/German/Spanish translations, not just the
-- two languages the first pass indexed) for each of those 94 individually,
-- rather than lowering the automated threshold. A lower threshold would
-- have produced clearly wrong matches (e.g. Hack Squat vs a generic "Slow
-- Squat", Preacher/Spider/Zottman Curl vs Leg Curl). Same rule as before:
-- an equipment-only substitution (e.g. Rack Pull/Trap Bar Deadlift reusing
-- a generic Deadlifts photo) is fine, a stance- or technique-defining
-- variant with no dedicated image is left blank rather than guessed.

update public.exercises set image_url = 'https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp.200x200_q85.jpg' where name = 'Barbell Hip Thrust' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/570/68b4a33f-40f1-4dda-b56c-a2e20ed13903.jpg.200x200_q85.png' where name = 'Barbell Shrug' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png.200x200_q85.png' where name = 'Bench Dip' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1706/0c5243cc-2539-4005-aee0-d3a8c5d3a32c.jfif.200x200_q85.jpg' where name = 'Bulgarian Split Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/91/Crunches-1.png.200x200_q85.png' where name = 'Cable Crunch' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1131/3bcf3024-2dcc-4995-9694-55aa2c2e4a9a.png.200x200_q85.jpg' where name = 'Cable Glute Kickback' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1378/7c1fcf34-fb7e-45e7-a0c1-51f296235315.jpg.200x200_q85.jpg' where name = 'Cable Lateral Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1567/0a8c155c-a48e-47e8-9df3-e39f025c6cad.png.200x200_q85.png' where name = 'Cable Rope Hammer Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1901/046f0f42-0ed5-48c5-a9ee-41de25e3b6a0.png.200x200_q85.jpg' where name = 'Clean and Jerk' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg.200x200_q85.jpg' where name = 'Deficit Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png.200x200_q85.jpg' where name = 'Dumbbell Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/570/68b4a33f-40f1-4dda-b56c-a2e20ed13903.jpg.200x200_q85.png' where name = 'Dumbbell Shrug' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/94/6dee2f60-aea2-4f2d-9bf6-aef50c4f9483.png.200x200_q85.jpg' where name = 'EZ-Bar Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1639/8927346e-f5ca-4795-bdf1-5ac9309401e7.webp.200x200_q85.jpg' where name = 'Face pull' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/256/b7def5bc-2352-499b-b9e5-fff741003831.png.200x200_q85.jpg' where name = 'Front Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/458/b7bd9c28-9f1d-4647-bd17-ab6a3adf5770.png.200x200_q85.png' where name = 'Gainage (planche)' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/130/Narrow-stance-hack-squats-1-1024x721.png.200x200_q85.png' where name = 'Hack Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1087/d85f4e02-b20c-457c-bdfb-0b00e2d14150.jpg.200x200_q85.jpg' where name = 'Hang Clean' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/978/d3ffe51f-7eb8-4cc9-9eae-105847af3005.png.200x200_q85.png' where name = 'Hanging Knee Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/979/27097a3a-5749-428d-b94c-6082afe390f6.png.200x200_q85.png' where name = 'Hanging Leg Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/12/4a42cc6f-648d-40cc-a72a-c49dd47e1667.webp.200x200_q85.png' where name = 'Hip Adduction Machine' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/81/Biceps-curl-1.png.200x200_q85.png' where name = 'Incline Dumbbell Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/238/2fc242d3-5bdd-4f97-99bd-678adb8c96fc.png.200x200_q85.jpg' where name = 'Incline Dumbbell Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1198/864906ac-4ac7-4e52-a886-c6bb97950a9f.jpg.200x200_q85.jpg' where name = 'Inverted Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1186/1987a039-cf35-437e-bbdc-40c53dd7d053.jpg.200x200_q85.jpg' where name = 'Kroc Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/148/lateral-dumbbell-raises-large-2.png.200x200_q85.jpg' where name = 'Landmine Lateral Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png.200x200_q85.jpg' where name = 'Lat Pulldown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1378/7c1fcf34-fb7e-45e7-a0c1-51f296235315.jpg.200x200_q85.jpg' where name = 'Leaning Lateral Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/146/8b284904-d072-4381-a256-4c81d8fd9c1f.png.200x200_q85.jpg' where name = 'Leg Press Calf Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/122/Incline-cable-flyes-1.png.200x200_q85.jpg' where name = 'Low-to-High Cable Fly' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1186/1987a039-cf35-437e-bbdc-40c53dd7d053.jpg.200x200_q85.jpg' where name = 'Meadows Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg.200x200_q85.jpg' where name = 'Mollets debout' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1738/0529acdf-ede8-42a2-a3e5-8d0c57b7a0e1.jpg.200x200_q85.jpg' where name = 'Neutral-Grip Pull-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/926/ae9deb5d-a1e9-4c30-b1e3-c128ba5d4969.png.200x200_q85.png' where name = 'Pec Deck Machine' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png.200x200_q85.jpg' where name = 'Pendlay Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1638/046c09b0-c35d-48d0-a552-39dd49f956d2.webp.200x200_q85.jpg' where name = 'Power Clean' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1947/4201a9c0-f9e4-48ca-80f1-b46c7ffe5640.webp.200x200_q85.jpg' where name = 'Power Snatch' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/193/Preacher-curl-3-1.png.200x200_q85.png' where name = 'Preacher Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg.200x200_q85.jpg' where name = 'Rack Pull' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/999/d0931eb3-8db0-4049-bb08-aa4036072056.jfif.200x200_q85.jpg' where name = 'Reverse Lunge' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/51/f1730f56-7aca-4566-8338-3e42b1bee6e1.webp.200x200_q85.png' where name = 'Reverse Wrist Curl' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/109/Barbell-rear-delt-row-1.png.200x200_q85.jpg' where name = 'Rowing barre' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1968/cd92e973-a0d9-4e5f-9011-5369012598d3.png.200x200_q85.png' where name = 'Seated Dumbbell Shoulder Press' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1642/a81ad922-caf5-47f8-99b4-640cb0717436.webp.200x200_q85.jpg' where name = 'Single-Leg Hip Thrust' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1736/aa724cc5-c485-4f3e-9d2a-0c6ae4baefbe.png.200x200_q85.jpg' where name = 'Single-Leg Romanian Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/84/Lying-close-grip-triceps-press-to-chin-1.png.200x200_q85.png' where name = 'Skull Crusher' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1801/60043328-1cfb-4289-9865-aaf64d5aaa28.jpg.200x200_q85.jpg' where name = 'Squat' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/622/9a429bd0-afd3-4ad0-8043-e9beec901c81.jpeg.200x200_q85.jpg' where name = 'Standing Calf Raise' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/981/f9377a7e-eb58-4cca-b805-2d36863aeb03.png.200x200_q85.png' where name = 'Step-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1652/0306c8c0-70cc-45d4-92de-6fa72ceaa834.webp.200x200_q85.jpg' where name = 'Stiff-Leg Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/106/T-bar-row-1.png.200x200_q85.png' where name = 'T-Bar Row' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/152/6c1a7459-266d-491a-bd50-7cbaea2bc771.png.200x200_q85.png' where name = 'Traction' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/184/1709c405-620a-4d07-9658-fade2b66a2df.jpeg.200x200_q85.jpg' where name = 'Trap Bar Deadlift' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/990/de20457c-914a-45c9-8cf9-0ad9739759a1.png.200x200_q85.png' where name = 'Triceps Kickback' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/113/Walking-lunges-1.png.200x200_q85.jpg' where name = 'Walking Lunge' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1100/ab203e0c-8220-4537-987c-871eb259d687.jpg.200x200_q85.jpg' where name = 'Wall Ball' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/194/34600351-8b0b-4cb0-8daa-583537be15b0.png.200x200_q85.png' where name = 'Weighted Chest Dip' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg.200x200_q85.jpg' where name = 'Weighted Pull-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1479/0305d98e-0887-4c0c-8992-7c220814efc2.webp.200x200_q85.png' where name = 'Weighted Sit-Up' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/158/0d51a0f2-622f-434b-beb8-1a003c54712a.png.200x200_q85.jpg' where name = 'Wide-Grip Lat Pulldown' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/475/b0554016-16fd-4dbe-be47-a2a17d16ae0e.jpg.200x200_q85.jpg' where name = 'Wide-Grip Pull-Up' and user_id is null;
