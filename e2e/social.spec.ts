import path from 'node:path'
import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

const TEST_PHOTO_PATH = path.join(import.meta.dirname, 'fixtures', 'test-photo.png')

test('logging a genuine 1-rep max creates a milestone visible in the feed', async ({ page }) => {
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

  // A genuine 1-rep attempt (reps=1) at a very deliberately heavy weight —
  // astronomically unlikely to already be this fixture account's best on
  // Squat, so this is a new PR regardless of what other tests logged
  // before it. Only reps=1 sets count as a real 1RM now (2026-07-24): a
  // heavy set of 5 no longer gets estimated into a "record" via the
  // Epley/Brzycki formula.
  await page.getByLabel('Charge (kg)').fill('999')
  await page.getByLabel('Reps').fill('1')
  await page.getByRole('button', { name: /Série \d/ }).click()
  await expect(page.getByText('999 kg')).toBeVisible()

  // The set is written to the offline-first local cache immediately (hence
  // the assertion above passing instantly); the actual Postgres insert that
  // fires the milestone-detection trigger happens on background sync a
  // moment later — same wait already used for this in offline-session-log.spec.ts.
  await page.waitForTimeout(3_000)

  await page.goto('/feed')
  // The stored value is now the exact weight lifted (999kg), not an
  // estimated 1RM from a higher-rep set — no formula involved anymore.
  const oneRepMaxEntry = page
    .locator('li')
    .filter({ hasText: 'Nouveau record · 1RM · Squat' })
    .filter({ hasText: '999 kg' })
  await expect(oneRepMaxEntry).toBeVisible({ timeout: 10_000 })

  // Cleanup: milestones are independent history, not cascaded by deleting
  // the program/session — removed explicitly via their own delete button
  // (milestones' delete policy scopes this to the owner).
  await oneRepMaxEntry.getByRole('button', { name: 'Supprimer ce record du feed' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(oneRepMaxEntry).toHaveCount(0)

  await page.goto('/programs')
  await page.getByRole('link', { name: programName }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})

test('reaching a weight goal creates a milestone visible in the feed', async ({ page }) => {
  // A very deliberately specific target — astronomically unlikely to
  // collide with a weight this fixture account already happens to be at.
  const targetWeightKg = '77.7'

  const infoCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Informations' }) })
  const weightCard = page
    .locator('[data-slot="card"]')
    .filter({ has: page.getByRole('heading', { name: 'Poids', exact: true }) })

  await page.goto('/profile')
  await page.getByLabel('Poids cible (kg)').fill(targetWeightKg)
  await infoCard.getByRole('button', { name: 'Enregistrer', exact: true }).click()

  await page.getByLabel("Peser aujourd'hui (kg)").fill(targetWeightKg)
  await weightCard.getByRole('button', { name: 'Enregistrer', exact: true }).click()
  await expect(page.getByText(`${targetWeightKg} kg`).first()).toBeVisible()

  await page.goto('/feed')
  const goalEntry = page
    .locator('li')
    .filter({ hasText: 'Objectif de poids atteint' })
    .filter({ hasText: `${targetWeightKg} kg` })
  await expect(goalEntry).toBeVisible({ timeout: 10_000 })

  // Cleanup: delete the milestone, the weight entry, and clear the target
  // so this test leaves the fixture account as it found it.
  await goalEntry.getByRole('button', { name: 'Supprimer ce record du feed' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(goalEntry).toHaveCount(0)

  await page.goto('/profile')
  await page.getByRole('button', { name: 'Supprimer cette pesée' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByLabel('Poids cible (kg)').fill('')
  // click() only waits for the event to dispatch, not for the mutation it
  // triggers — without waiting for the PATCH response, the test ends and
  // Playwright tears down the page before the request ever reaches the
  // network, silently leaving target_weight_kg dirty for the next run
  // (confirmed via network trace: only the earlier "set to 77.7" PATCH was
  // ever sent). toBeEnabled() alone isn't enough either — it can observe
  // the pre-click "enabled" state before React re-renders to pending, so
  // it must wait for the actual response.
  await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' && response.url().includes('/rest/v1/profiles'),
    ),
    infoCard.getByRole('button', { name: 'Enregistrer', exact: true }).click(),
  ])
})

test('creates a post with a photo, shows it in the feed, then deletes it', async ({ page }) => {
  const caption = `E2E Photo ${Date.now()}`

  await page.goto('/feed')
  await page.getByPlaceholder('Partage une pensée, une victoire…').fill(caption)
  // The trigger button opens a native file picker Playwright can't drive —
  // setInputFiles targets the hidden <input type="file"> directly instead,
  // same pattern already used for JSON import in data-import.spec.ts.
  await page.getByLabel('Choisir une photo').setInputFiles(TEST_PHOTO_PATH)
  await expect(page.getByAltText('Aperçu')).toBeVisible()

  await page.getByRole('button', { name: 'Publier' }).click()

  const photoEntry = page.locator('li').filter({ hasText: caption })
  await expect(photoEntry).toBeVisible({ timeout: 10_000 })
  await expect(photoEntry.getByRole('img')).toBeVisible()

  await photoEntry.getByRole('button', { name: 'Supprimer ce post du feed' }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(photoEntry).toHaveCount(0)
})
