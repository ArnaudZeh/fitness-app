-- Photos pour les exercices personnalisés du compte arnaud.zeh@gmail.com,
-- matchées manuellement contre le catalogue wger.de (même source/convention
-- que les deux passes précédentes sur le catalogue système). Couverture
-- partielle assumée : 4/6, les 2 restants (Cross Body Hammer Curl, Single
-- Arm Lat Pulldown) n'ont aucune correspondance wger avec une image assez
-- fiable — le seul match de nom exact pour chacun n'a aucune photo, et les
-- variantes génériques disponibles (hammer curl droit, lat pulldown bilatéral
-- à la barre) montrent un mouvement ou un équipement visiblement différent.
-- Une mauvaise photo est pire que pas de photo.
update public.exercises set image_url = 'https://wger.de/media/exercise-images/925/67dbb1c9-b378-46f9-adb6-1f55b3d3007a.png' where id = '519050e8-5574-45fa-8369-5bc813b20ff9'; -- Incline Chest Press ~ Smith Machine Slight Incline Press
update public.exercises set image_url = 'https://wger.de/media/exercise-images/1117/2555c4c3-a84d-47db-b83b-cbf721f12e45.png' where id = '5e8d35fb-97bd-415e-94df-a18a9976c65c'; -- Seated Wide Grip Row ~ Seated Cable Row (même famille de mouvement, déjà utilisée pour "Seated Cable Row" au catalogue)
update public.exercises set image_url = 'https://wger.de/media/exercise-images/129/b263c968-e067-4750-916a-d8758a7df23e.webp' where id = 'e570b72a-9c5a-408a-955c-0452908d3e21'; -- Single Arm Chest Press ~ machine à bras indépendants (déjà utilisée pour "Machine Chest Press" au catalogue)
update public.exercises set image_url = 'https://wger.de/media/exercise-images/150/Barbell-shrugs-1.png' where id = '2876cbeb-5734-4c1d-bf3c-e5c423ed897c'; -- Smith Machine Shrugs ~ Barbell Shrug (équipement seul diffère, même mouvement)

-- Bug trouvé en cherchant ces correspondances, pas lié aux exercices
-- personnalisés ci-dessus : "Barbell Shrug" et "Dumbbell Shrug" du catalogue
-- système pointaient tous les deux vers https://wger.de/media/exercise-images/570/...
-- qui n'est PAS une photo d'exercice mais une icône générique (logo d'appli
-- fitness), visible par tous les comptes. Remplacées par de vraies photos de
-- démonstration (shrug barre / shrug haltères).
update public.exercises set image_url = 'https://wger.de/media/exercise-images/150/Barbell-shrugs-1.png' where name = 'Barbell Shrug' and user_id is null;
update public.exercises set image_url = 'https://wger.de/media/exercise-images/151/Dumbbell-shrugs-1.png' where name = 'Dumbbell Shrug' and user_id is null;
