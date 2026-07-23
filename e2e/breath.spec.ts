import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('creates a protocol, runs it to completion, then cleans up', async ({ page }) => {
  const protocolName = `E2E Apnée ${Date.now()}`

  await page.goto('/apnee')
  await page.getByLabel('Nom').fill(protocolName)
  await page.getByLabel('Apnée (s)').fill('1')
  await page.getByLabel('Récup (s)').fill('1')
  await page.getByLabel('Cycles').fill('1')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

  await expect(page.getByText(protocolName)).toBeVisible()
  await page
    .getByRole('listitem')
    .filter({ hasText: protocolName })
    .getByRole('button', { name: 'Lancer' })
    .click()

  await expect(page.getByText('Apnée', { exact: true })).toBeVisible()
  await expect(page.getByText('Cycle 1/1')).toBeVisible()

  // Real countdown (1s hold + 1s recovery) rather than the skip button, to
  // prove the timer itself transitions phases and completes on its own.
  await expect(page.getByText('Récupération')).toBeVisible({ timeout: 5000 })
  await expect(page.getByText('Protocole terminé 🎉')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: 'Fermer' }).click()

  await page.getByRole('button', { name: `Supprimer ${protocolName}` }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText(protocolName)).toHaveCount(0)
})

test('the skip button advances the phase immediately', async ({ page }) => {
  const protocolName = `E2E Apnée Skip ${Date.now()}`

  await page.goto('/apnee')
  await page.getByLabel('Nom').fill(protocolName)
  await page.getByLabel('Apnée (s)').fill('60')
  await page.getByLabel('Récup (s)').fill('60')
  await page.getByLabel('Cycles').fill('2')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

  await page
    .getByRole('listitem')
    .filter({ hasText: protocolName })
    .getByRole('button', { name: 'Lancer' })
    .click()

  await expect(page.getByText('Apnée', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Passer' }).click()
  await expect(page.getByText('Récupération')).toBeVisible()
  await page.getByRole('button', { name: 'Arrêter' }).click()

  await page.getByRole('button', { name: `Supprimer ${protocolName}` }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText(protocolName)).toHaveCount(0)
})

test('rejects submitting the create form without required fields', async ({ page }) => {
  await page.goto('/apnee')

  const addButton = page.getByRole('button', { name: 'Ajouter', exact: true })
  await expect(addButton).toBeDisabled()

  await page.getByLabel('Nom').fill('Sans durées')
  await expect(addButton).toBeDisabled()
})
