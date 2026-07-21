import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('structures a program with a day and an exercise, then cleans up', async ({
  page,
}) => {
  const programName = `E2E Structure ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un jour' }).click()
  await page.getByLabel('Nom du jour').fill('Jour A')
  await page.getByRole('button', { name: 'Ajouter le jour' }).click()
  await expect(page.getByRole('heading', { name: 'Jour A' })).toBeVisible()

  await page.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.locator('#exercise-select').click()
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByLabel('Séries').fill('4')
  await page.getByLabel('Reps min').fill('6')
  await page.getByLabel('Reps max').fill('10')
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()

  // Wait for the dialog to actually close before asserting — Radix Select
  // also renders a visually-hidden native <select> with a "Squat" <option>,
  // so a bare getByText('Squat') is ambiguous while the dialog is still open.
  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.getByText('4 x 6-10')).toBeVisible()

  // Cleanup: deleting the program cascades its day/exercise (RLS + FK on delete cascade).
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
