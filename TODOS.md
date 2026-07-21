# TODOs

Tracker unique des TODO en attente, conformément à la règle "aucun TODO non tracké en fin de phase".

## P0 — Infrastructure & squelette

- [ ] Remplacer les icônes PWA placeholder (`public/pwa-192x192.png`, `public/pwa-512x512.png` — carrés unis `#0b0f14`) par de vraies icônes de marque lors de la phase design UI (`ui-ux-pro-max` + `frontend-design`).

## P1 — Auth & multi-tenant

- [ ] Avant le go-live (P13) : configurer un provider SMTP dédié (Resend/Postmark/SendGrid) pour les emails d'auth. Le service email intégré de Supabase est limité à quelques emails/heure sur ce projet (confirmé pendant les tests E2E — `over_email_send_rate_limit`), pas prévu pour de l'usage réel au-delà de tests ponctuels.
- [ ] Avant le go-live (P13) : revoir la config auth hébergée (`site_url`, `additional_redirect_urls`, `minimum_password_length`) — actuellement les valeurs par défaut Supabase, le `supabase/config.toml` local pointe encore vers `127.0.0.1` et ne doit pas être poussé tel quel (`supabase config push`) sans revue complète.
- [ ] Playwright : n'a que Chromium pour l'instant. Ajouter WebKit (proxy iOS Safari) en phase Polish (P11) quand le mobile-first sera vérifié visuellement.
