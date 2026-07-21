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
- [ ] Sélecteur d'exercice actuellement un `<Select>` simple groupé par muscle group. Le user a explicitement demandé une **search bar + visuels simples**, groupés par muscle (retour du 2026-07-21 après test réel). Prioritaire pour la prochaine passe UI — pas juste un "nice to have" P11 comme noté précédemment. Candidat pour `mcp__magic__21st_magic_component_builder`/`_refiner` (21st.dev) une fois que le user envoie ses exemples de design.
- [ ] `pnpm audit` : 1 vulnérabilité modérée acceptée en connaissance de cause — `shadcn` (devDependency, requis pour `src/index.css` → `@import 'shadcn/tailwind.css'`) dépend transitivement de `@modelcontextprotocol/sdk` → `@hono/node-server` (CVE path traversal Windows-only dans `serve-static`, sert uniquement le registry MCP local de la CLI shadcn, jamais invoqué par cette app, jamais bundlé côté client). Pas de version corrigée disponible en amont (4.13.1 = dernière version au 2026-07-21). À revérifier périodiquement (`pnpm audit` + `npm view shadcn versions`).

## Phase Profil (à venir, après cette simplification)

- Le Profil (mensurations, objectifs) doit être conçu dès le départ pour permettre, plus tard, des recommandations d'entraînement pilotées par IA en fonction des objectifs déclarés (le user veut que "tout soit lié" — profil → programmes → IA). L'IA elle-même reste P9, ne pas l'anticiper, mais ne pas non plus concevoir le schéma du Profil de façon qui rendrait ce lien difficile plus tard.
