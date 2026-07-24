import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('rejects an invalid Anthropic key with a clear error, persists nothing', async ({
  page,
}) => {
  await page.goto('/profile')

  await expect(page.getByText('Anthropic (Claude)', { exact: true })).toBeVisible()
  await expect(page.getByText('Non configurée').first()).toBeVisible()

  const apiKeyInput = page.getByLabel('Clé API · Anthropic (Claude)')
  await apiKeyInput.fill('sk-ant-totally-fake-invalid-key')

  const form = apiKeyInput.locator('xpath=ancestor::form[1]')
  await form.getByRole('button', { name: 'Enregistrer' }).click()

  await expect(page.getByText('Clé Anthropic invalide ou révoquée.')).toBeVisible({
    timeout: 15_000,
  })
  // Still not configured — a failed validation must never persist a key.
  await expect(page.getByText('Non configurée').first()).toBeVisible()
})
