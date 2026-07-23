import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

// Cross-user visibility (does an opted-in user's feed show up for someone
// else, does an opted-out user's stay hidden) needs a second real account
// to verify meaningfully — too destructive/slow for the shared e2e suite,
// same call already made for account deletion in P5a. Verified manually
// instead with a throwaway account + direct SQL (see TODOS.md).
test('toggles progress sharing from the profile', async ({ page }) => {
  await page.goto('/profile')
  const section = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Partage de progrès' }) })
  const toggle = section.getByRole('button', { name: /^(Activer|Désactiver)$/ })
  const wasEnabled = (await toggle.textContent())?.trim() === 'Désactiver'

  await toggle.click()
  await expect(toggle).toHaveText(wasEnabled ? 'Activer' : 'Désactiver')

  // Leave it as found.
  await toggle.click()
  await expect(toggle).toHaveText(wasEnabled ? 'Désactiver' : 'Activer')
})

test('logging a new best set creates a milestone visible in the feed', async ({ page }) => {
  const programName = `E2E Social ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  const mondayCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: 'Lundi' }) })
  await mondayCard.getByRole('button', { name: 'Entraînement' }).click()
  await expect(mondayCard.getByRole('button', { name: 'Ajouter un exercice' })).toBeVisible()
  await mondayCard.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Squat')
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByLabel('Séries').fill('1')
  await page.getByLabel('Reps min').fill('5')
  await page.getByLabel('Reps max').fill('5')
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)

  await mondayCard.getByRole('button', { name: /Démarrer la séance|Continuer la séance/ }).click()
  await page.waitForURL(/\/sessions\//)

  // A very deliberately heavy, one-off weight — astronomically unlikely to
  // already be this fixture account's best on Squat, so this is a new PR
  // regardless of what other tests logged before it.
  await page.getByLabel('Charge (kg)').fill('999')
  await page.getByLabel('Reps').fill('5')
  await page.getByRole('button', { name: /Série \d/ }).click()
  await expect(page.getByText('999 kg')).toBeVisible()

  // The set is written to the offline-first local cache immediately (hence
  // the assertion above passing instantly); the actual Postgres insert that
  // fires the milestone-detection trigger happens on background sync a
  // moment later — same wait already used for this in offline-session-log.spec.ts.
  await page.waitForTimeout(3_000)

  await page.goto('/feed')
  // Scoped to the exact estimated 1RM for 999kg x 5 (Epley/Brzycki average,
  // see src/lib/one-rep-max.ts), not just "a Squat record" — other specs in
  // this suite also log Squat sets (e.g. 100kg x 5), which leaves their own
  // milestone entries in the same feed.
  const oneRepMaxEntry = page
    .locator('li')
    .filter({ hasText: 'Nouveau record — 1RM estimé — Squat' })
    .filter({ hasText: '1144.69 kg' })
  await expect(oneRepMaxEntry).toBeVisible({ timeout: 10_000 })

  // Same set (999kg x 5 = 4995kg tonnage) is also, incidentally, this
  // week's best by a wide margin over anything else this suite logs.
  const tonnageEntry = page
    .locator('li')
    .filter({ hasText: 'Nouveau record — tonnage hebdo' })
    .filter({ hasText: '4995 kg cette semaine-là' })
  await expect(tonnageEntry).toBeVisible()

  // Cleanup: milestones are independent history, not cascaded by deleting
  // the program/session — removed explicitly via their own delete buttons
  // (milestones' delete policy scopes this to the owner).
  for (const entry of [oneRepMaxEntry, tonnageEntry]) {
    await entry.getByRole('button', { name: 'Supprimer ce record du feed' }).click()
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(entry).toHaveCount(0)
  }

  await page.goto('/programs')
  await page.getByRole('link', { name: programName }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
