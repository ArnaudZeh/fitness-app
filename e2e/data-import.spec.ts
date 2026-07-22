import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('rejects an invalid JSON file with a clear error', async ({ page }, testInfo) => {
  const filePath = testInfo.outputPath('invalid-export.json')
  const fs = await import('node:fs/promises')
  await fs.writeFile(filePath, 'this is not json')

  await page.goto('/profile')
  await page.getByLabel("Fichier d'import").setInputFiles(filePath)

  await expect(
    page.getByText("Fichier invalide : ce n'est pas un JSON valide."),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: "Confirmer l'import" })).toHaveCount(0)
})

test('exports a program, re-imports it, and duplicates it (not weight entries)', async ({
  page,
}, testInfo) => {
  const programName = `E2E Import ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  await page.goto('/profile')
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter mes données' }).click()
  const download = await downloadPromise
  const filePath = testInfo.outputPath('export.json')
  await download.saveAs(filePath)

  await page.getByLabel("Fichier d'import").setInputFiles(filePath)
  await expect(page.getByText(/programme\(s\)/)).toHaveCount(0) // sanity: result not shown yet
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByRole('button', { name: "Confirmer l'import" }).click()

  await expect(page.getByText(/^Import terminé/)).toBeVisible({ timeout: 15_000 })
  await expect(page.getByText(/erreur\(s\)/)).toHaveCount(0)

  // The imported program is a duplicate with a fresh id — two entries with
  // the same name now exist. Clean up both. The programs list query isn't
  // "active" while we're on a detail page, so deleting doesn't eagerly
  // refetch it — only marks it stale. Navigating back renders the list's
  // last-known (stale) data instantly while a background refetch runs, so
  // we explicitly wait for the count to drop after each deletion rather
  // than assuming the list is already fresh the instant the URL changes.
  await page.goto('/programs')
  await expect(page.getByRole('heading', { name: programName })).toHaveCount(2)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('heading', { name: programName }).first().click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
    await expect(page).toHaveURL('/programs', { timeout: 20_000 })
    await expect(page.getByRole('heading', { name: programName })).toHaveCount(1 - i)
  }
})
