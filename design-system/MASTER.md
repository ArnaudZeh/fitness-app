# Design system — Fitness

Source de vérité pour toutes les phases UI. Lire ce fichier avant de générer des écrans ; les fichiers `pages/*.md` ne contiennent que les écarts par rapport à ce document.

## Direction esthétique

**"Précision technique sombre"** — un outil de suivi sérieux, utilisable en salle de sport en basse lumière, qui ne ressemble ni à un SaaS générique (indigo/violet) ni à une app fitness cliché (orange criard). L'accent teal fait écho au module hypoxie intermittente (oxygène/respiration) — c'est le vrai différenciateur du produit, autant que ça se voie dans l'identité visuelle.

Thème **sombre par défaut** (pas seulement pour le "mode silencieux gym" — c'est l'identité du produit). Un mode clair pourra être ajouté plus tard (`⚠️ Backlog`), non bloquant pour le MVP.

## Palette

```
--color-background:      #0b0f14   /* fond principal, quasi-noir à sous-ton graphite */
--color-surface:         #121924   /* cards, panels */
--color-surface-raised:  #1a2330   /* éléments élevés : modals, sheets */
--color-on-surface:      #e8ecef   /* texte principal — jamais blanc pur */
--color-on-surface-muted:#8b96a3   /* texte secondaire, labels, placeholders */
--color-border:          #232d3a

--color-primary:         #4de8d0   /* accent teal — oxygène/respiration, CTAs principaux */
--color-primary-foreground: #06231e /* texte sur fond primary */
--color-secondary:       #ff8a4c   /* ember — intensité/effort, RPE élevé, alerte timer */
--color-success:         #6ee7a8
--color-error:           #ff5d5d
```

Vérifié : `on-surface` (#e8ecef) sur `background` (#0b0f14) ≈ 15.5:1 (AAA). `primary-foreground` sur `primary` ≈ 8.9:1 (AAA). `on-surface-muted` sur `background` ≈ 7.2:1 (AAA).

Règle : jamais de couleur seule pour porter un sens (RPE élevé = ember **+ icône/texte**, jamais juste une pastille rouge).

## Typographie

```
Display/Heading: Space Grotesk — 500/600/700
Body:            Plus Jakarta Sans — 400/500
Mono (chiffres/timer/charges): JetBrains Mono — 400/500, chiffres tabulaires
```

Échelle :

```
--text-xs:   12px/1.4
--text-sm:   14px/1.5
--text-base: 16px/1.6
--text-lg:   18px/1.5
--text-xl:   20px/1.4
--text-2xl:  24px/1.3
--text-3xl:  30px/1.2
--text-4xl:  36px/1.15
```

Les valeurs numériques (charges, reps, timer, 1RM) utilisent toujours `font-mono` avec `font-variant-numeric: tabular-nums`.

## Espacement & rayon

Échelle 4px : 4, 8, 12, 16, 24, 32, 48, 64, 96.

Rayon : **soft/rounded** (8–12px) — approchable mais discipliné, pas de `rounded-full` hors badges/tags.

## Ombres

Philosophie **subtile** — sur fond sombre, les box-shadows classiques ne se voient presque pas. On élève les éléments via un ton de surface plus clair (`surface` → `surface-raised`) plutôt que via des ombres lourdes, plus une bordure `border` discrète.

## Contraintes UX non négociables (§ Critical, ui-ux-pro-max)

- Touch targets ≥ 44×44px, espacement ≥ 8px entre cibles tactiles — critique en mode gym (usage une main, ganté/en sueur)
- Contraste texte ≥ 4.5:1 partout (vérifié ci-dessus, marge confortable pour lisibilité en salle)
- Focus visible sur tout élément interactif (`ring` teal, jamais juste une bordure discrète)
- Labels de formulaire toujours visibles (jamais placeholder-only)
- Erreurs inline, près du champ concerné, jamais génériques

## ⚠️ Backlog

- Mode clair (toggle thème) — non bloquant pour le MVP, écrans conçus dark-only pour l'instant
