# Projet : App Fitness / Musculation personnelle (multi-tenant ready)

## 1. Contexte et vision

Je veux construire une web app de suivi de musculation et de bien-être, **strictement à mon usage dans un premier temps**, puis potentiellement ouverte à quelques amis et collègues. L'app doit être une **PWA responsive** (web-first, installable sur l'écran d'accueil iPhone/Android/desktop), avec **Supabase** comme backend, et une architecture **multi-tenant prête dès le jour 1** (auth + Row Level Security), même si je suis seul utilisateur au départ.

L'objectif produit : un outil unique qui remplace 3 ou 4 apps que je jongle actuellement (log de séance, timer, journal, recommandations), avec une **couche IA** pour les recommandations personnalisées.

## 2. Environnement de dev

- macOS
- Visual Studio Code + extension Claude
- Node.js LTS
- Git + GitHub
- Compte Supabase (à créer si besoin, free tier suffisant)
- Clé API Anthropic pour les recommandations IA (stockée en variable d'environnement côté serveur/edge function, jamais en clair côté client)

## 3. Stack technique cible

À valider en phase 0 avec moi avant de démarrer :

- **Frontend** : React 18 + TypeScript + Vite
- **UI** : Tailwind CSS + shadcn/ui (composants accessibles, cohérents, facilement stylables)
- **PWA** : vite-plugin-pwa (manifest, service worker, cache stratégique)
- **State** : Zustand ou Jotai pour l'état global léger, TanStack Query pour la synchro serveur
- **Backend** : Supabase (Postgres + Auth email/password ou magic link + RLS + Edge Functions pour les appels IA)
- **Cache offline** : IndexedDB (via Dexie.js) + queue de synchronisation vers Supabase quand la connexion revient
- **Graphiques** : Recharts ou Visx
- **Tests** : Vitest + Testing Library, Playwright pour les parcours critiques
- **Lint / format** : ESLint + Prettier + strict TypeScript

Si tu as une meilleure recommandation argumentée, propose-la en phase 0.

## 4. Fonctionnalités attendues (V1)

### Programmation d'entraînement
- Créer, éditer et versionner des programmes de musculation
- Structurer un programme sur plusieurs semaines avec des **blocs de périodisation** (accumulation, intensification, réalisation, deload)
- Marquer chaque bloc par focus (force, hypertrophie, endurance)
- Générer les séances hebdo à partir de la structure du bloc

### Log de séance (mode gym)
- Timer de repos entre séries (avec vibration + son)
- Saisie rapide charge / reps / RPE ou RIR par série
- **Mode "silencieux gym"** : écran sombre, gros boutons, utilisable d'une main
- Saisie vocale optionnelle pour logger une série mains libres
- Calculateur de plaques (combinaison optimale à mettre sur la barre pour une charge cible)
- **Fonctionne 100% offline pendant la séance**, sync automatique au retour du réseau

### Analytics et progression
- Calcul et suivi du **1RM estimé** (formules Epley, Brzycki) par exercice
- Graphiques de progression (charge max, volume total, tonnage hebdo) par exercice et global
- **Heatmap type GitHub contributions** pour visualiser la régularité annuelle
- Historique consultable par séance, semaine, bloc

### Hypoxie intermittente
- Séquences configurables : durée d'apnée, durée de récup, nombre de cycles
- Intégration au workflow séance : pré-séance, intra-séance (entre exercices), post-séance
- Presets et sauvegarde de protocoles perso

### Planning bien-être quotidien
- Programmer des activités récurrentes (vacuum sous la douche, Wim Hof au réveil, cold plunge, etc.)
- Rappels via **notifications push PWA** (iOS 16.4+ / Android)
- Vue du jour et vue semaine

### Module cycles menstruels (activable par utilisatrice)
- Saisie des dates de cycle
- Adaptation des recommandations d'entraînement selon la phase (charge, volume, fatigue perçue)
- Adaptation nutritionnelle par phase (besoins caloriques et glucidiques, vigilance sur le déficit énergétique relatif)
- **Cadré comme recommandations générales, pas comme outil médical**, disclaimer clair dans l'UI

### Couche IA
- Recommandations de progression (charges à viser, deload suggéré si stagnation ou fatigue déclarée)
- Analyse de tendance après un bloc
- Suggestions d'ajustements du planning bien-être
- Appels API Anthropic (Claude) via **Edge Function Supabase**, jamais depuis le client, pour ne pas exposer la clé

### Data ownership
- **Export JSON** de toutes les données de l'utilisateur, à tout moment
- **Import JSON** pour restauration
- Suppression complète du compte et des données sur demande

## 5. Contraintes produit non négociables

- **Mono-user dès le jour 1, multi-user prêt dès le jour 1** : chaque table qui contient de la donnée utilisateur a une colonne `user_id` et une policy RLS Supabase qui restreint l'accès aux lignes de l'utilisateur authentifié
- **Offline-first pour la séance** : je dois pouvoir logger une séance complète dans un sous-sol sans réseau, et retrouver les données synchronisées à la maison
- **Mobile-first** : le design se pense sur écran de téléphone d'abord, desktop ensuite
- **Zéro clé API en clair côté client**, jamais
- **Aucune donnée sensible en localStorage non chiffré** (rien de médical identifiable, notamment sur le module cycles)

## 6. Skills locaux à utiliser

Les skills suivants sont disponibles sur ma machine. Lis-les au moment pertinent, ne les fusionne pas tous d'un coup :

- **`phased-dev`** : consulte-le **en premier**. Il pilote la méthodologie globale. Chaque phase se termine par une validation explicite de ma part avant de passer à la suivante. Ne jamais enchaîner deux phases sans validation.
- **`graphify`** : à lancer **après chaque phase de développement significative** (nouvelle fonctionnalité, refactor majeur). Génère le knowledge graph du projet pour économiser les tokens dans les requêtes suivantes. Utilise ce graph plutôt que de re-parcourir tout le code à chaque nouvelle demande.
- **`ui-ux-pro-max`** : consulte-le **avant chaque phase impliquant de l'UI** (design system initial, écrans de séance, dashboard analytics, module cycles). Applique les principes UX, accessibilité, animation et adaptation mobile.
- **`frontend-design`** : consulte-le **en parallèle de `ui-ux-pro-max`** pour la direction visuelle distinctive. L'app ne doit pas ressembler à un template générique.
- **`owasp-security`** : consulte-le **à la fin de chaque phase touchant à l'auth, à Supabase, aux Edge Functions, ou aux appels IA**. Vérifie systématiquement : gestion des secrets, RLS effective, validation d'input, CORS, CSP, XSS, injection SQL, exposition d'API. Traite chaque finding sérieusement.

## 7. Méthodologie de développement attendue

### Phase 0 : cadrage
- Lire `phased-dev` puis proposer une découpe en phases
- Confirmer le stack technique (section 3) ou proposer mieux avec justification
- Créer le repo, initialiser Vite + TS + Tailwind + shadcn, configurer Prettier/ESLint/tsconfig strict
- Créer le projet Supabase, définir le schéma initial de la base (uniquement `profiles` et l'auth pour commencer)
- **Fin de phase = validation de la structure de projet et du plan de phases avec moi**

### Phases suivantes (à proposer, exemple indicatif)
Chaque phase respecte ce cycle :
1. Rappel du scope de la phase et des skills à consulter
2. Design des tables Supabase concernées + policies RLS
3. Design UI (avec `ui-ux-pro-max` + `frontend-design`)
4. Implémentation frontend + backend
5. Tests unitaires et un test de parcours Playwright si critique
6. Audit sécurité de la phase avec `owasp-security`
7. `graphify` pour mettre à jour le knowledge graph
8. Validation avec moi avant phase suivante

### Règles de code
- TypeScript strict, pas de `any` sauf justification commentée
- Composants React fonctionnels + hooks, pas de classes
- Un composant par fichier, colocation des styles et tests
- Commits atomiques avec messages conventionnels
- Chaque Edge Function a un test qui valide l'input et vérifie qu'elle refuse les appels non authentifiés
- Aucun `TODO` laissé en fin de phase sans être tracké dans un fichier `TODOS.md`

## 8. Guardrails supplémentaires

- Ne jamais me faire installer un package sans expliquer pourquoi et vérifier qu'il est maintenu
- Ne jamais commit de `.env` ni de clé API, `.gitignore` doit être irréprochable dès le premier commit
- Toute donnée personnelle sensible (santé, cycles) doit être chiffrée au repos si stockée, et l'utilisateur doit pouvoir tout exporter et tout supprimer en 2 clics
- Toujours proposer un fallback si une API tierce (Anthropic) est indisponible : l'app doit rester utilisable en mode dégradé sans IA
- La PWA doit passer un audit Lighthouse propre avant merge en `main`

## 9. Ce que j'attends comme premier message

Dans ta première réponse :
1. Confirme que tu as lu ce prompt en entier
2. Consulte `phased-dev` et résume la méthodologie que tu vas suivre
3. Propose une découpe complète du projet en phases numérotées avec objectifs et livrables de chacune
4. Confirme (ou challenge argumenté) le stack de la section 3
5. **Ne code rien encore**, attends ma validation de la phase 0

À toi.
