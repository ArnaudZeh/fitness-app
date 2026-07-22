import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

const WEEKDAY_LABELS_FR = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
]

test('dashboard shows and lets you start today\'s scheduled session', async ({ page }) => {
  const programName = `E2E Dashboard ${Date.now()}`
  const todayLabel = WEEKDAY_LABELS_FR[new Date().getDay()]

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  const todayCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: todayLabel, exact: true }) })
  await todayCard.getByRole('button', { name: 'Entraînement' }).click()
  await todayCard.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Squat')
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })

  // Programs default to "draft" — the dashboard only picks up active ones.
  await page.getByRole('button', { name: 'Actif', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Actif', exact: true })).toHaveAttribute(
    'data-variant',
    'default',
  )

  // Full reload rather than an in-app navigation — sidesteps any stale
  // TanStack Query cache left over from visiting /programs earlier in this
  // same test, guaranteeing the dashboard's program list is fetched fresh.
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.getByRole('heading', { name: "Aujourd'hui" })).toBeVisible()
  await expect(page.getByText(programName)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Démarrer la séance' })).toBeVisible()

  await page.getByRole('button', { name: 'Démarrer la séance' }).click()
  await expect(page.getByRole('heading', { name: todayLabel })).toBeVisible({
    timeout: 20_000,
  })

  await page.goto('/')
  await expect(page.getByRole('link', { name: 'Continuer la séance' })).toBeVisible()

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.goto('/programs')
  await page.getByRole('link', { name: programName }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
