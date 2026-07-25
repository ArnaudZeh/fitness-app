import { expect, test as setup } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'
const authFile2 = 'e2e/.auth/user2.json'

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

// Second fixture account, only consumed by friends.spec.ts — a friend
// request needs two real, independently-authenticated users to exercise
// the accept side, which the single default fixture can't do alone.
setup('authenticate as the second E2E fixture account', async ({ page }) => {
  const email = process.env.PLAYWRIGHT_TEST_EMAIL_2
  const password = process.env.PLAYWRIGHT_TEST_PASSWORD_2
  if (!email || !password) {
    throw new Error(
      'Missing PLAYWRIGHT_TEST_EMAIL_2/PLAYWRIGHT_TEST_PASSWORD_2 — check your .env.local',
    )
  }

  await page.goto('/login')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL('/')

  await page.context().storageState({ path: authFile2 })
})
