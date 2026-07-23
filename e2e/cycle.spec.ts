import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

// The app computes "today" from local date components (see
// todayLocalDate() in CyclePage.tsx) — toISOString() is UTC and can land on
// a different calendar date depending on the runner's timezone offset.
function todayLocalDate(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

test.describe.serial('cycle module', () => {
  test.afterAll(async ({ browser }) => {
    // Best-effort reset so this suite leaves the fixture account as it
    // found it, regardless of which tests below ran/failed.
    const page = await browser.newPage({ storageState: 'e2e/.auth/user.json' })
    await page.goto('/profile')
    const disableButton = page.getByRole('button', { name: 'Désactiver' })
    if (await disableButton.isVisible().catch(() => false)) {
      await disableButton.click()
    }
    await page.close()
  })

  test('shows a disabled prompt on /cycle until activated from the profile', async ({
    page,
  }) => {
    await page.goto('/cycle')
    await expect(page.getByText('Ce module est désactivé.')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Hypoxie intermittente' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cycle' })).toHaveCount(0)
  })

  test('activates the module from the profile, revealing the nav link', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Activer' }).click()
    await expect(page.getByRole('button', { name: 'Désactiver' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cycle' })).toBeVisible()
  })

  test('logs a cycle start date and shows an estimated phase', async ({ page }) => {
    await page.goto('/cycle')
    await expect(page.getByText('Aucune date enregistrée').first()).toBeVisible()

    await page.getByLabel('Début des dernières règles').fill(todayLocalDate())
    await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

    await expect(page.getByText('Phase actuelle : Menstruelle')).toBeVisible()
    await expect(page.getByText("Jour 1 d'un cycle estimé à 28 jours.")).toBeVisible()
    await expect(page.getByText('Entraînement')).toBeVisible()
    await expect(page.getByText('Nutrition')).toBeVisible()

    // Clean up the entry so re-running this spec starts from a blank slate.
    await page.getByRole('button', { name: /Supprimer la date du/ }).click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByText('Aucune date enregistrée').first()).toBeVisible()
  })

  test('deactivates the module, hiding the nav link again', async ({ page }) => {
    await page.goto('/profile')
    await page.getByRole('button', { name: 'Désactiver' }).click()
    await expect(page.getByRole('button', { name: 'Activer' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cycle' })).toHaveCount(0)
  })
})
