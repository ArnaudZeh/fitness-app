# Fitness

App de suivi de musculation et de bien-être — PWA offline-first, Supabase (Postgres + Auth + RLS + Edge Functions), multi-tenant prête dès le jour 1.

Voir `docs/CLAUDE_CODE_PROMPT.md` pour le brief complet et `TODOS.md` pour les TODO en attente.

## Stack

- React 19 + TypeScript (strict) + Vite
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres + Auth + RLS + Edge Functions)
- vite-plugin-pwa

## Démarrer

```bash
pnpm install
pnpm dev
```

## Scripts

- `pnpm dev` — serveur de dev
- `pnpm build` — build de prod (type-check + bundle)
- `pnpm lint` — ESLint
- `pnpm format` — Prettier (écrit)
- `pnpm format:check` — Prettier (vérifie sans écrire)

## Supabase

Projet hébergé (org "Fitness", région Paris `eu-west-3`, ref `whzbcbgurflsqhznzdse`). Les migrations SQL vivent dans `supabase/migrations/` et se poussent avec :

```bash
supabase db push
```

Variables d'environnement requises dans `.env.local` (voir `.env.example`) — jamais commitées.
