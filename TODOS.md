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
