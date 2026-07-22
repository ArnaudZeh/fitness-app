# TODOs

Tracker unique des TODO en attente, conformément à la règle "aucun TODO non tracké en fin de phase".

## P0 — Infrastructure & squelette

- [ ] Remplacer les icônes/favicon placeholder (`public/pwa-192x192.png`, `public/pwa-512x512.png` — carrés unis `#0b0f14` ; `public/favicon.svg` — cercle teal minimal, remplacé début P1 car c'était encore le logo par défaut du template Vite) par de vraies icônes de marque lors de la phase design UI (`ui-ux-pro-max` + `frontend-design`). Repéré par `graphify` P1 (communauté isolée "Leftover Vite Favicon Branding").

## P1 — Auth & multi-tenant

- [ ] Avant le go-live (P13) : configurer un provider SMTP dédié (Resend/Postmark/SendGrid) pour les emails d'auth. Le service email intégré de Supabase est limité à quelques emails/heure sur ce projet (confirmé pendant les tests E2E — `over_email_send_rate_limit`), pas prévu pour de l'usage réel au-delà de tests ponctuels.
- [ ] Avant le go-live (P13) : revoir la config auth hébergée (`site_url`, `additional_redirect_urls`, `minimum_password_length`) — actuellement les valeurs par défaut Supabase, le `supabase/config.toml` local pointe encore vers `127.0.0.1` et ne doit pas être poussé tel quel (`supabase config push`) sans revue complète.
- [ ] Playwright : n'a que Chromium pour l'instant. Ajouter WebKit (proxy iOS Safari) en phase Polish (P11) quand le mobile-first sera vérifié visuellement.

## P2a — Programmes & blocs

- [ ] Le projet Supabase gratuit a un cold-start perceptible (une requête peut prendre plusieurs secondes après une période d'inactivité) — les tests E2E tournent en 1 seul worker (`playwright.config.ts`) pour éviter la contention, et l'assertion de suppression a un timeout étendu à 20s. À revisiter si on passe sur un tier payant ou une DB locale (Docker).
- [ ] Les types Supabase (`src/lib/database.types.ts`) sont générés une fois via `supabase gen types typescript` — à régénérer après chaque nouvelle migration (P2b et suivantes), sinon les nouvelles tables ne seront pas typées.

## P2b — Catalogue d'exercices & génération de séances

- [ ] `session_template_exercises.exercise_id` référence `exercises` par FK sans vérifier que l'exercice est accessible (catalogue système ou exercice perso de l'utilisateur) au moment de l'insert — un utilisateur pourrait créer une référence "orpheline" vers l'exercice privé d'un autre utilisateur (deviné par UUID). Aucune fuite de données possible (RLS bloque toujours la lecture), juste une référence morte théorique. Pas prioritaire, mais à durcir avec une contrainte/trigger si on ouvre l'app à plusieurs utilisateurs réels.

## Architecture pivot (2026-07-21, post P2a/P2b) — voir mémoire "P2 architecture pivot"

- Cette phase a supprimé `blocks` (périodisation), `sessions` + `generate_block_sessions()` (pré-génération de séances). `focus` est passé du Bloc au Programme. Le vrai logging de séance (remplaçant `sessions`) est repoussé à P3 — c'est sa place naturelle, pas la peine de le tracker séparément ici.
- [ ] `pnpm audit` : 1 vulnérabilité modérée acceptée en connaissance de cause — `shadcn` (devDependency, requis pour `src/index.css` → `@import 'shadcn/tailwind.css'`) dépend transitivement de `@modelcontextprotocol/sdk` → `@hono/node-server` (CVE path traversal Windows-only dans `serve-static`, sert uniquement le registry MCP local de la CLI shadcn, jamais invoqué par cette app, jamais bundlé côté client). Pas de version corrigée disponible en amont (4.13.1 = dernière version au 2026-07-21). À revérifier périodiquement (`pnpm audit` + `npm view shadcn versions`).

## Jours fixes Lundi-Dimanche (2026-07-21)

- Remplacé la création manuelle de "jours" par une structure fixe : chaque programme a toujours exactement 7 `session_templates` (1=Lundi...7=Dimanche), auto-créées par le trigger `on_program_created` (même pattern que `handle_new_user` en P0). L'utilisateur bascule juste chaque jour entre "Repos" et "Entraînement" au lieu de nommer/ordonner des jours.
- RLS durcie : policies INSERT/DELETE retirées sur `session_templates` (seuls SELECT/UPDATE restent) — un utilisateur ne peut plus casser l'invariant "toujours 7 jours" en ajoutant/supprimant une ligne. Vérifié en live.
- `duplicateProgram()` adapté en conséquence : les 7 jours de la copie existent déjà (trigger), donc on les met à jour (`day_type` + exercices copiés) au lieu de les insérer.
- RPE : définition ajoutée en texte d'aide sous le champ (pas de tooltip — mobile-first, le hover ne fonctionne pas au toucher).

## Phase Profil (2026-07-21/22)

- Le Profil (mensurations, objectifs) est conçu pour permettre, plus tard, des recommandations d'entraînement pilotées par IA en fonction des objectifs déclarés (le user veut que "tout soit lié" — profil → programmes → IA). L'IA elle-même reste backlog (P9), ce qui a été fait ici : étendre `profiles` (P0) plutôt que créer une nouvelle table, avec des colonnes explicitement typées (`goal`, `sex` en check constraints) faciles à référencer depuis un futur prompt IA.
- Table `weight_entries` créée (time-series, une entrée par jour via `unique(user_id, recorded_at)` + upsert) — pas de graphique pour l'instant, c'est le scope de P5 (analytics). RLS complète (select/insert/update/delete, `auth.uid() = user_id`) vérifiée en live avec deux comptes jetables (isolation croisée testée : lecture, update, insert tous bloqués sur le profil/les pesées d'autrui).
- `src/pages/ProfilePage.tsx` : formulaire profil (`ProfileForm`, state initialisé directement depuis les props — pas de `useEffect` de synchro, pour éviter le anti-pattern "setState dans un effect" détecté par `eslint-plugin-react-hooks`) + section pesée (log du jour + liste + suppression via `ConfirmDialog`). Testé en live à 390px (mobile) : sauvegarde profil persistée après reload, log de pesée, suppression de pesée avec confirmation — tout fonctionne.
- Aucune nouvelle dépendance ajoutée ; `pnpm audit` toujours à 1 vulnérabilité modérée acceptée (voir note P2a/P2b ci-dessus, inchangée).

## Sélecteur d'exercice — search bar + visuels (2026-07-22)

- Remplacé le `<Select>` groupé par muscle group dans `ExerciseSlotFormDialog` par `src/components/ExercisePicker.tsx` : recherche live (filtrage local, pas le filtre interne de cmdk — `shouldFilter={false}`) + groupes par muscle avec une icône `lucide-react` par groupe (Dumbbell/Shirt/PersonStanding/BicepsFlexed/Footprints/Target/Activity pour pectoraux/dos/épaules/bras/jambes/core/full_body). "Visuels" = ces icônes de groupe, pas de vraies photos d'exercices — ça reste backlog tant que le user n'a pas envoyé ses exemples 21st.dev.
- Nouvelle dépendance : composant shadcn `command` (ajoute `cmdk` — maintenu, ~40k dl/semaine) + `input-group` (dépendance du composant `command`). `shadcn add` a de nouveau créé le dossier `@/` parasite à la racine (bug CLI connu, cf. notes P0/P1) — seuls `command.tsx`/`input-group.tsx` étaient réellement nouveaux, déplacés manuellement ; `button.tsx`/`input.tsx`/`textarea.tsx`/`dialog.tsx` régénérés étaient identiques (diff = guillemets simples vs doubles uniquement), donc ignorés.
- Bug mobile réel découvert en testant ce picker à 390px : `DialogContent` (`src/components/ui/dialog.tsx`) n'avait pas de `max-height`/`overflow-y-auto` — un formulaire un peu long (comme celui-ci une fois la liste d'exercices ajoutée) poussait son propre titre et son bouton de soumission hors viewport, sans aucun moyen de scroller pour les atteindre. Corrigé au niveau du composant de base (`max-h-[calc(100vh-2rem)] overflow-y-auto`) donc ça bénéficie à toutes les dialogs de l'app, pas seulement celle-ci.
- `e2e/session-structure.spec.ts` mis à jour : `#exercise-select` (Radix Select, supprimé) → `getByPlaceholder('Rechercher un exercice…')` + `getByRole('option', ...)` (cmdk rend ses items avec `role="option"`, confirmé dans le bundle `cmdk`).
- Testé en live à 390px : recherche/filtrage, sélection (coche + résumé "Sélection : X"), pré-remplissage en mode édition, scroll interne de la liste + scroll du dialog, soumission — tout fonctionne. Suite Playwright complète (7 tests) + Vitest (13 tests) verts après la modification.
