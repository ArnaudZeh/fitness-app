-- P7 du plan nutrition : audit RLS + validation des inputs numériques sur
-- meal_slots/nutrition_targets/food_logs (voir TODOS.md).
--
-- 1) food_logs.meal_slot_id référence meal_slots(id) via une simple FK, qui
-- garantit seulement que la ligne existe, pas qu'elle appartient au même
-- utilisateur — la policy insert/update d'origine ne vérifiait que
-- food_logs.user_id, jamais la propriété du meal_slot_id référencé. Rien
-- dans l'app ne construit une requête pareille (useMealSlots() ne renvoie
-- que les repas de l'utilisateur courant), mais une requête forgée à la
-- main pourrait rattacher un food_log à un meal_slot_id d'un autre
-- utilisateur (deviné/récupéré ailleurs). Impact réel limité — la lecture
-- de meal_slots reste bloquée par sa propre RLS, donc pas de fuite de
-- données — mais c'est un vrai trou d'intégrité référentielle entre tables
-- RLS, à fermer par principe.
drop policy "Users can insert their own food logs" on public.food_logs;
create policy "Users can insert their own food logs"
  on public.food_logs for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.meal_slots
      where meal_slots.id = food_logs.meal_slot_id
        and meal_slots.user_id = auth.uid()
    )
  );

drop policy "Users can update their own food logs" on public.food_logs;
create policy "Users can update their own food logs"
  on public.food_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.meal_slots
      where meal_slots.id = food_logs.meal_slot_id
        and meal_slots.user_id = auth.uid()
    )
  );

-- 2) Bornes hautes ajoutées sur les totaux calories/macros — jusqu'ici
-- seul un plancher (>= 0 / > 0) existait, un `integer` sans plafond accepte
-- n'importe quelle valeur absurde (mauvaise saisie, chiffre en trop, bug
-- client) qui casserait ensuite les pourcentages/barres de progression du
-- dashboard. Plafonds volontairement très larges — jamais atteignables par
-- un usage réel, uniquement là pour attraper une valeur corrompue avant
-- qu'elle ne se propage à l'affichage. Le plancher existant n'est pas
-- touché (pas de changement de comportement pour une valeur légitime).
alter table public.food_logs
  drop constraint food_logs_calories_check,
  add constraint food_logs_calories_check check (calories >= 0 and calories <= 20000);

alter table public.food_logs
  drop constraint food_logs_protein_g_check,
  add constraint food_logs_protein_g_check check (protein_g >= 0 and protein_g <= 2000);

alter table public.food_logs
  drop constraint food_logs_carbs_g_check,
  add constraint food_logs_carbs_g_check check (carbs_g >= 0 and carbs_g <= 2000);

alter table public.food_logs
  drop constraint food_logs_fat_g_check,
  add constraint food_logs_fat_g_check check (fat_g >= 0 and fat_g <= 2000);

alter table public.nutrition_targets
  drop constraint nutrition_targets_calories_target_check,
  add constraint nutrition_targets_calories_target_check
    check (calories_target > 0 and calories_target <= 20000);

alter table public.nutrition_targets
  drop constraint nutrition_targets_protein_g_target_check,
  add constraint nutrition_targets_protein_g_target_check
    check (protein_g_target >= 0 and protein_g_target <= 2000);

alter table public.nutrition_targets
  drop constraint nutrition_targets_carbs_g_target_check,
  add constraint nutrition_targets_carbs_g_target_check
    check (carbs_g_target >= 0 and carbs_g_target <= 2000);

alter table public.nutrition_targets
  drop constraint nutrition_targets_fat_g_target_check,
  add constraint nutrition_targets_fat_g_target_check
    check (fat_g_target >= 0 and fat_g_target <= 2000);
