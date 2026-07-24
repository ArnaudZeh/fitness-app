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

// Headless Chromium supports Notification/serviceWorker/PushManager, so the
// card renders its "supported" branch — but actually subscribing hits a
// real push service (FCM) and would leave a live subscription row on the
// fixture account, so that flow is verified manually rather than here (see
// TODOS.md P6b).
test('shows the notifications card with an enable button', async ({ page }) => {
  await page.goto('/bien-etre')

  await expect(page.getByRole('heading', { name: 'Notifications' })).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Activer les notifications' }),
  ).toBeEnabled()
})

// Hypoxia protocols were merged into this same page (2026-07-23) — they're
// just another kind of wellness exercise now, picked via the "Protocole
// hypoxie" tab in the create card instead of living on their own /apnee
// route (moved from the old breath.spec.ts, adapted to the merged UI).
test('creates a protocol, runs it to completion, then cleans up', async ({ page }) => {
  const protocolName = `E2E Apnée ${Date.now()}`

  await page.goto('/bien-etre')
  await page.getByRole('button', { name: 'Protocole hypoxie' }).click()
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

  await page.goto('/bien-etre')
  await page.getByRole('button', { name: 'Protocole hypoxie' }).click()
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

test('rejects submitting the protocol form without required fields', async ({ page }) => {
  await page.goto('/bien-etre')
  await page.getByRole('button', { name: 'Protocole hypoxie' }).click()

  const addButton = page.getByRole('button', { name: 'Ajouter', exact: true })
  await expect(addButton).toBeDisabled()

  await page.getByLabel('Nom').fill('Sans durées')
  await expect(addButton).toBeDisabled()
})
