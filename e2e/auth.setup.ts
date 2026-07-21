import { expect, test as setup } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'

setup('authenticate as the persistent E2E fixture account', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Missing PLAYWRIGHT_TEST_EMAIL/PLAYWRIGHT_TEST_PASSWORD — check your .env.local',
    )
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL('/')

  await page.context().storageState({ path: authFile })
})
