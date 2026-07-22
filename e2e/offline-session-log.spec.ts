import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('logs a set while offline, then syncs once back online', async ({ page }) => {
  const programName = `E2E Offline ${Date.now()}`

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

  // Starting the session while online lets the plan cache warm and the
  // session_logs row sync before we cut the network.
  await mondayCard.getByRole('button', { name: 'Démarrer la séance' }).click()
  await expect(page.getByRole('heading', { name: 'Lundi' })).toBeVisible({
    timeout: 20_000,
  })
  await page.waitForTimeout(2_000)

  await page.context().setOffline(true)

  await page.getByLabel('Charge (kg)').fill('70')
  await page.getByLabel('Reps').fill('10')
  await page.getByRole('button', { name: 'Série 1' }).click()
  await expect(page.getByText('Série 1 — 70 kg x 10')).toBeVisible()
  // No error surfaced to the user for a purely local, offline write.
  await expect(page.getByRole('alert')).toHaveCount(0)

  await page.context().setOffline(false)
  await page.waitForTimeout(3_000)

  // Wipe the local cache so anything still visible after reload had to come
  // fresh from Supabase — proof the offline write actually reached the server.
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const request = indexedDB.deleteDatabase('fitness-offline')
        request.onsuccess = () => resolve(undefined)
        request.onerror = () => resolve(undefined)
      }),
  )
  await page.reload()

  await expect(page.getByText('Série 1 — 70 kg x 10')).toBeVisible({ timeout: 20_000 })

  await page.getByRole('link', { name: 'Retour au programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  // Cleanup: deleting the program cascades its days/exercises/session logs.
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
