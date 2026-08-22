-- 2e passe sur les photos d'exercices manquantes (voir TODOS.md "photos
-- manquantes"). wger.de est quasiment à sec sur les 36 exercices restants
-- (variantes très spécifiques) : sur les candidats vérifiés un par un via
-- son API (exerciseinfo/<id>/), un seul avait réellement une image. Source
-- ajoutée : Free Exercise DB (github.com/yuhonas/free-exercise-db), jeu de
-- données ouvert sous licence Unlicense (domaine public, aucune attribution
-- requise) — couvre correctement ~25 des 36 exercices restants, vérifié
-- visuellement un par un avant d'écrire cette migration (même discipline
-- que la 1re passe wger : une mauvaise photo est pire que pas de photo).
-- Quelques variantes d'équipement acceptées comme suffisamment proches du
-- mouvement réel (ex. Arnold Press en kettlebell plutôt qu'haltères, Glute
-- Bridge à la barre plutôt qu'au poids du corps) — même tolérance déjà
-- appliquée dans la 1re passe (plusieurs variantes de curl/push-up
-- partageant une seule image).
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Drag_Curl/0.jpg' where name = 'Drag Curl' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg' where name = 'Farmer''s Walk' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Farmers_Walk/0.jpg' where name = 'Farmer''s Carry' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/JM_Press/0.jpg' where name = 'JM Press' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Barbell_Curl/0.jpg' where name = 'Reverse Barbell Curl' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Spider_Curl/0.jpg' where name = 'Spider Curl' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Zottman_Curl/0.jpg' where name = 'Zottman Curl' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Dead_Bug/0.jpg' where name = 'Dead Bug' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Mountain_Climbers/0.jpg' where name = 'Mountain Climber' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Crunch/0.jpg' where name = 'Reverse Crunch' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Standing_Cable_Wood_Chop/0.jpg' where name = 'Cable Woodchopper' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Hyperextensions_Back_Extensions/0.jpg' where name = 'Back Extension' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Arnold_Press/0.jpg' where name = 'Arnold Press' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Cuban_Press/0.jpg' where name = 'Cuban Press' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Reverse_Flyes/0.jpg' where name = 'Reverse Pec Deck' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Battling_Ropes/0.jpg' where name = 'Battle Ropes' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Front_Box_Jump/0.jpg' where name = 'Box Jump' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Drag_-_Harness/0.jpg' where name = 'Sled Pull' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Sled_Push/0.jpg' where name = 'Sled Push' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Thruster/0.jpg' where name = 'Thruster' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Kettlebell_Turkish_Get-Up_Lunge_style/0.jpg' where name = 'Turkish Get-Up' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Donkey_Calf_Raises/0.jpg' where name = 'Donkey Calf Raise' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Barbell_Glute_Bridge/0.jpg' where name = 'Glute Bridge' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Overhead_Squat/0.jpg' where name = 'Overhead Squat' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Weighted_Sissy_Squat/0.jpg' where name = 'Sissy Squat' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Zercher_Squats/0.jpg' where name = 'Zercher Squat' and user_id is null;
update public.exercises set image_url = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/Svend_Press/0.jpg' where name = 'Svend Press' and user_id is null;

-- Réutilise une photo déjà présente dans notre propre catalogue (même
-- mouvement, juste un nom anglais distinct de "Soulevé de terre roumain")
-- plutôt que d'introduire une 3e source pour un seul exercice.
update public.exercises set image_url = (
  select image_url from public.exercises where name = 'Soulevé de terre roumain' and user_id is null
)
where name = 'Romanian Deadlift (RDL)' and user_id is null;
