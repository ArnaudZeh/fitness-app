import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('shows logged sets in the analytics page', async ({ page }) => {
  const programName = `E2E Analytics ${Date.now()}`

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

  await page.getByLabel('Charge (kg)').fill('100')
  await page.getByLabel('Reps').fill('5')
  await page.getByRole('button', { name: 'Série 1' }).click()
  await expect(page.getByText('Série 1 · 100 kg x 5')).toBeVisible()

  await page.getByRole('button', { name: 'Terminer la séance' }).click()
  await expect(page.getByText('Terminée')).toBeVisible()

  await page.getByRole('link', { name: 'Analytics' }).click()
  await expect(page.getByRole('heading', { name: 'Analytics' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Régularité' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tonnage hebdomadaire' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Progression par exercice' }),
  ).toBeVisible()
  await expect(page.getByText('Aucune série enregistrée')).toHaveCount(0)
  await expect(page.getByRole('combobox', { name: 'Choisir un exercice' })).toContainText(
    'Squat',
  )

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.goto('/programs')
  await page.getByRole('link', { name: programName }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
