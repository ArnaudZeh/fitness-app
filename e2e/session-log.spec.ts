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

  await mondayCard.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Squat')
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })

  await mondayCard.getByRole('button', { name: 'Démarrer la séance' }).click()
  await expect(page.getByRole('heading', { name: 'Lundi' })).toBeVisible({
    timeout: 20_000,
  })
  await expect(page.getByText('En cours')).toBeVisible()

  await page.getByLabel('Charge (kg)').fill('100')
  await page.getByLabel('Reps').fill('5')
  await page.getByRole('button', { name: 'Série 1' }).click()
  await expect(page.getByText('Série 1 — 100 kg x 5')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer la séance' }).click()
  await expect(page.getByText('Terminée')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Terminer la séance' })).toHaveCount(0)

  await page.getByRole('link', { name: 'Retour au programme' }).click()
  await expect(page.getByRole('heading', { name: 'Historique' })).toBeVisible()
  const historyEntry = page
    .locator('li')
    .filter({ has: page.getByRole('link', { name: /Lundi/ }) })
  await expect(historyEntry.getByText('Terminée')).toBeVisible()

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
