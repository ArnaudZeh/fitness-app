import { expect, type Page, test as setup } from '@playwright/test'

const authFile = 'e2e/.auth/user.json'
const authFile2 = 'e2e/.auth/user2.json'

// NotificationsPromptDialog shows once per (browser, app version) — it pops
// up asynchronously (waits on a push-subscription check) after first login,
// and would otherwise cover the page and block every spec that navigates
// right after auth. Dismissing it here, before the storageState snapshot is
// written, marks it "seen" in localStorage for that version — captured into
// storageState so every spec reusing this fixture starts past it. Read the
// version from the running app itself (localStorage key set on dismiss)
// rather than hardcoding it, since it's the current git SHA and changes on
// every commit.
async function dismissNotificationsPrompt(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: 'Plus tard' })
    .click({ timeout: 5_000 })
    .catch(() => {})
}

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
  await dismissNotificationsPrompt(page)

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
  await dismissNotificationsPrompt(page)

  await page.context().storageState({ path: authFile2 })
})
