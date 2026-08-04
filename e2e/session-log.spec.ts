import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('starts a session, logs a set, completes it, then cleans up', async ({ page }) => {
  const programName = `E2E Log ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  const mondayCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: 'Lundi' }) })
  await mondayCard.getByRole('button', { name: 'Entraînement' }).click()

  // Supersets are created by multi-selecting exercises in the picker (no
  // manual "Superset" text field anymore) — pick two, then configure each
  // in turn.
  await mondayCard.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByRole('button', { name: 'Créer un superset' }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Squat')
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Développé couché')
  await page.getByRole('option', { name: 'Développé couché', exact: true }).click()
  await page.getByRole('button', { name: 'Continuer avec 2 exercices' }).click()
  await page.getByRole('button', { name: 'Exercice suivant' }).click()
  await page.getByRole('button', { name: 'Créer le superset (2 exercices)' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
  await expect(mondayCard.getByText('Superset A')).toBeVisible()

  await mondayCard.getByRole('button', { name: 'Démarrer la séance' }).click()
  await expect(page.getByRole('heading', { name: 'Lundi' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('En cours')).toBeVisible()
  await expect(page.getByText('Superset A')).toBeVisible()

  // Two exercise cards are on screen now (the superset) — scope to Squat's
  // card so the charge/reps locators aren't ambiguous between the two.
  const squatCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Squat', exact: true }) })

  await squatCard.getByLabel('Charge (kg)').fill('100')
  await squatCard.getByLabel('Reps').fill('5')
  await squatCard.getByRole('button', { name: 'Série 1' }).click()
  await expect(squatCard.getByText('Série 1 · 100 kg x 5')).toBeVisible()

  // Logging a set auto-starts the rest timer.
  await expect(page.getByText('Repos', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Passer' })).toBeVisible()

  // Duplicate the set instead of retyping the same charge/reps.
  await squatCard.getByRole('button', { name: 'Dupliquer cette série' }).click()
  await expect(squatCard.getByText('Série 2 · 100 kg x 5')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer la séance' }).click()
  await expect(page.getByText('Terminée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Terminer la séance' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Retour au programme' }).click()
  await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible()
  const historyEntry = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: /lundi/i }) })
  await expect(historyEntry.getByText('Terminée')).toBeVisible()

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
