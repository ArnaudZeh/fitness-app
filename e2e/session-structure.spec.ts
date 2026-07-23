import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('marks a day as training and adds an exercise, then cleans up', async ({ page }) => {
  const programName = `E2E Structure ${Date.now()}`

  await page.goto('/programs')
  await page.getByRole('link', { name: 'Nouveau programme' }).click()
  await page.getByLabel('Nom du programme').fill(programName)
  await page.getByRole('button', { name: 'Créer le programme' }).click()
  await expect(page.getByRole('heading', { name: programName })).toBeVisible()

  // All 7 weekdays exist by default, marked "Repos" — no "add a day" step needed.
  await expect(page.getByRole('heading', { name: 'Lundi' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Dimanche' })).toBeVisible()

  const mondayCard = page
    .locator('li')
    .filter({ has: page.getByRole('heading', { name: 'Lundi' }) })
  await mondayCard.getByRole('button', { name: 'Entraînement' }).click()
  await expect(
    mondayCard.getByRole('button', { name: 'Ajouter un exercice' }),
  ).toBeVisible()

  await mondayCard.getByRole('button', { name: 'Ajouter un exercice' }).click()
  await page.getByPlaceholder('Rechercher un exercice…').fill('Squat')
  await page.getByRole('option', { name: 'Squat', exact: true }).click()
  await page.getByLabel('Séries').fill('4')
  await page.getByLabel('Reps min').fill('6')
  await page.getByLabel('Reps max').fill('10')
  await page.getByRole('button', { name: "Ajouter l'exercice" }).click()

  await expect(page.getByRole('dialog')).toHaveCount(0, { timeout: 20_000 })
  await expect(page.getByText('4 x 6-10')).toBeVisible()

  // Cleanup: deleting the program cascades its days/exercise (RLS + FK on delete cascade).
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})

// Same limitation as the AI program-generation guard test: the fixture
// account has no AI provider key configured (BYOK), so this is the one
// state of the adaptation dialog reachable without spending a real API call.
test('AI session adaptation prompts for a key when none is configured', async ({ page }) => {
  const programName = `E2E Adapt Guard ${Date.now()}`

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

  await mondayCard.getByRole('button', { name: "Adapter avec l'IA" }).click()
  await expect(
    page.getByText('Configure une clé API (Anthropic ou OpenAI) dans ton profil'),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Configurer une clé' }).click()
  await expect(page).toHaveURL('/profile')

  // Cleanup.
  await page.goto('/programs')
  await page.getByRole('heading', { name: programName }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await page.getByRole('button', { name: 'Supprimer définitivement' }).click()
  await expect(page).toHaveURL('/programs', { timeout: 20_000 })
})
