import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('creates a program with a focus, then cleans up', async ({ page }) => {
  const programName = `E2E Programme ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await expect(page).toHaveURL('/programs/new')

  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()
  await expect(page.getByText('Hypertrophie')).toBeVisible()

  // Cleanup: deleting the program cascades its session templates (RLS + FK on delete cascade).
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
  await expect(page.getByRole('heading', { name: programName })).toHaveCount(0)
})

test('goes back to the programs list without creating a program', async ({ page }) => {
  await page.goto('/programs')
  await expect(page.getByRole('heading', { name: 'Mes programmes' })).toBeVisible()
})
