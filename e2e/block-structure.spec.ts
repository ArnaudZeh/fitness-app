import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('structures a block with a day, an exercise, then generates sessions', async ({ page }) => {
  const programName = `E2E Structure ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un bloc' }).click()
  await page.getByLabel('Nom du bloc').fill('Bloc structure')
  await page.getByRole('button', { name: 'Ajouter le bloc' }).click()
  await expect(page.getByRole('heading', { name: 'Bloc structure' })).toBeVisible()

  await page.getByRole('button', { name: 'Structure de la séance' }).click()
  await expect(page).toHaveURL(/\/programs\/.+\/blocks\/.+/)
  await expect(page.getByRole('heading', { name: 'Bloc structure' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un jour' }).click()
  await page.getByLabel('Nom du jour').fill('Jour A')
  await page.getByRole('button', { name: 'Ajouter le jour' }).click()
  await expect(page.getByRole('heading', { name: 'Jour A' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.locator('#exercise-select').click()
  await page.getByRole('option', { name: 'Squat' }).click()
  await page.getByLabel('Séries').fill('4')
  await page.getByLabel('Reps min').fill('6')
  await page.getByLabel('Reps max').fill('10')
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()
  // Wait for the dialog to actually close before asserting — Radix Select
  // also renders a visually-hidden native <select> with a "Squat" <option>,
  // so a bare getByText('Squat') is ambiguous while the dialog is still open.
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.getByText('4 x 6-10')).toBeVisible()

  await page.getByRole('button', { name: 'Générer les séances' }).click()
  await expect(page.getByText(/séance.*générée.*sur/)).toBeVisible({ timeout: 20_000 })

  // Cleanup: back to the program and delete it (cascades block/templates/sessions).
  await page.getByRole('link', { name: 'Retour au programme' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
