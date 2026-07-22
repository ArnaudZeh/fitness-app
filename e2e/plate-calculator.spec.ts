import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('computes a plate breakdown for a target weight', async ({ page }) => {
  const programName = `E2E Plates ${Date.now()}`

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

  await page.getByRole('button', { name: 'Calculateur de plaques' }).click()
  await page.getByLabel('Charge cible (kg)').fill('100')
  // Per side: (100 - 20) / 2 = 40 -> 25 + 15.
  await expect(page.getByText('25', { exact: true })).toBeVisible()
  await expect(page.getByText('15', { exact: true })).toBeVisible()

  // Changing the bar weight recomputes the breakdown.
  await page.getByLabel('Barre (kg)').fill('15')
  // Per side: (100 - 15) / 2 = 42.5 -> 25 + 15 + 2.5.
  await expect(page.getByText('2.5', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Close' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.getByRole('link', { name: 'Retour au programme' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
