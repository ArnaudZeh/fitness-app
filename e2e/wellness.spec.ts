import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

// 1=Monday..7=Sunday, matching WEEKDAY_LABELS in src/lib/sessions-api.ts.
const WEEKDAY_LABELS_FR = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

test('creates a recurring wellness activity, marks it done today, then cleans up', async ({
  page,
}) => {
  const activityName = `E2E Wellness ${Date.now()}`
  const todayLabel = WEEKDAY_LABELS_FR[new Date().getDay()]

  await page.goto('/bien-etre')
  await page.getByLabel('Nom').fill(activityName)
  await page.getByRole('button', { name: todayLabel, exact: true }).click()
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()

  // Shows in today's day view since today's weekday was selected — only the
  // day view renders a "Marquer comme fait" button, so this is unambiguous
  // even though the activity name itself also appears in the management
  // list below.
  await expect(page.getByText(activityName)).toHaveCount(2)
  await expect(page.getByRole('button', { name: 'Marquer comme fait' })).toBeVisible()
  await page.getByRole('button', { name: 'Marquer comme fait' }).click()
  await expect(page.getByRole('button', { name: 'Fait ✓' })).toBeVisible()

  // Reload: the "done" state must persist server-side, not just in local state.
  await page.reload()
  await expect(page.getByRole('button', { name: 'Fait ✓' })).toBeVisible()

  // Week view shows the same activity, scheduled today. (The management
  // list below still renders the name too, hence .first() — it's the
  // week-view row since that section comes first in DOM order.)
  await page.getByRole('button', { name: 'Semaine', exact: true }).click()
  await expect(page.getByText(activityName).first()).toBeVisible()
  await page.getByRole('button', { name: 'Jour', exact: true }).click()

  // Clean up via the management list.
  await page.getByRole('button', { name: `Supprimer ${activityName}` }).click()
  await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
  await expect(page.getByText(activityName)).toHaveCount(0)
})

test('rejects submitting the create form without a name or without a day', async ({
  page,
}) => {
  await page.goto('/bien-etre')

  const addButton = page.getByRole('button', { name: 'Ajouter', exact: true })
  await expect(addButton).toBeDisabled()

  await page.getByLabel('Nom').fill('Sans jour')
  await expect(addButton).toBeDisabled()
})
