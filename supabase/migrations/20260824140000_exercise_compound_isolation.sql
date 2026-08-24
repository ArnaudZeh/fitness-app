-- Classification polyarticulaire/isolation des exercices, prérequis pour
-- l'adaptation reps/charge par focus à la duplication (voir TODOS.md).
-- Colonne booléenne plutôt qu'un enum à 2 valeurs — pas d'autre catégorie
-- prévue, un booléen dit directement ce qu'il faut. Défaut `true`
-- (polyarticulaire) : plus sûr par défaut qu'`isolation`, un exercice mal
-- classé en polyarticulaire garde juste une fourchette de reps un peu plus
-- basse que l'idéal plutôt que l'inverse.
--
-- Classification faite à la main exercice par exercice (pas un simple
-- regex sur le nom aveuglément appliqué), sur le critère pratique
-- "mono-articulaire isolant un seul groupe musculaire, chargé comme un
-- exercice d'accessoire" plutôt que la définition biomécanique stricte
-- articulation-par-articulation — les mouvements de hanche lourds chargés
-- comme des compounds (Hip Thrust, Good Morning, Romanian Deadlift) sont
-- classés polyarticulaires malgré une seule articulation mobile, cohérent
-- avec la façon dont ils sont réellement programmés/chargés en pratique,
-- pas avec leur définition anatomique littérale. Revoir au cas par cas si
-- un exercice précis semble mal classé.
alter table public.exercises add column is_compound boolean not null default true;

update public.exercises set is_compound = false where user_id is null and name in (
  'Ab Wheel Rollout',
  'Back Extension',
  'Barbell Shrug',
  'Bicycle Crunch',
  'Cable Crunch',
  'Cable Curl',
  'Cable Fly',
  'Cable Front Raise',
  'Cable Glute Kickback',
  'Cable Lateral Raise',
  'Cable Rear Delt Fly',
  'Cable Rope Hammer Curl',
  'Cable Triceps Pushdown',
  'Cable Woodchopper',
  'Concentration Curl',
  'Crunch lesté',
  'Cuban Press',
  'Curl biceps',
  'Dead Bug',
  'Donkey Calf Raise',
  'Drag Curl',
  'Dumbbell Fly',
  'Dumbbell Shrug',
  'Élévations latérales',
  'Extension triceps',
  'EZ-Bar Curl',
  'Face pull',
  'Front Raise',
  'Gainage (planche)',
  'Glute Bridge',
  'Hammer Curl',
  'Hanging Knee Raise',
  'Hanging Leg Raise',
  'Hip Abduction Machine',
  'Hip Adduction Machine',
  'Hollow Body Hold',
  'Incline Dumbbell Curl',
  'Incline Dumbbell Fly',
  'JM Press',
  'Landmine Lateral Raise',
  'Leaning Lateral Raise',
  'Leg Extension',
  'Leg Press Calf Raise',
  'Low-to-High Cable Fly',
  'Lying Leg Curl',
  'Mollets debout',
  'Nordic Hamstring Curl',
  'Overhead Cable Triceps Extension',
  'Overhead Dumbbell Triceps Extension',
  'Pallof Press',
  'Pec Deck Machine',
  'Preacher Curl',
  'Rear Delt Fly',
  'Reverse Barbell Curl',
  'Reverse Crunch',
  'Reverse Pec Deck',
  'Reverse Wrist Curl',
  'Rope Triceps Pushdown',
  'Russian Twist',
  'Seated Calf Raise',
  'Seated Leg Curl',
  'Side Plank',
  'Sissy Squat',
  'Sit-Up',
  'Skull Crusher',
  'Spider Curl',
  'Standing Calf Raise',
  'Straight-Arm Pulldown',
  'Svend Press',
  'Toes to Bar',
  'Triceps Kickback',
  'V-Up',
  'Weighted Sit-Up',
  'Wrist Curl',
  'Zottman Curl'
);
