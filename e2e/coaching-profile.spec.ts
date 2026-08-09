import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('fills fields across an expanded and a collapsed category, and persists across reload', async ({
  page,
}) => {
  await page.goto('/profile/coaching')
  await expect(page.getByRole('heading', { name: 'Fiche coaching' })).toBeVisible()

  // "Objectifs & motivation" is one of the categories that starts expanded.
  const objectivesCard = page
    .getByRole('heading', { name: 'Objectifs & motivation' })
    .locator('xpath=ancestor::div[@data-slot="card"][1]')
  const targetEventInput = objectivesCard.getByLabel(
    'Événement cible (mariage, compétition…)',
  )
  await expect(targetEventInput).toBeVisible()

  await targetEventInput.fill('Trail 20km')
  await objectivesCard.getByLabel('Pourquoi maintenant ?').fill('Envie de retrouver la forme')
  await objectivesCard.getByLabel('Échéance visée').click()
  await page.getByRole('option', { name: '3 mois', exact: true }).click()
  // Synchronization point: the controlled Select's onValueChange must have
  // flushed into React state before submitting, or the form's snapshot at
  // click time can still hold the pre-selection value.
  await expect(objectivesCard.getByLabel('Échéance visée')).toContainText('3 mois')
  await objectivesCard.getByRole('button', { name: 'Enregistrer' }).click()

  // "Sommeil" starts collapsed — its fields aren't even in the DOM until expanded.
  const sleepCard = page
    .getByRole('heading', { name: 'Sommeil' })
    .locator('xpath=ancestor::div[@data-slot="card"][1]')
  await expect(sleepCard.getByLabel('Heures de sommeil moyennes par nuit')).toHaveCount(0)
  await sleepCard.getByRole('button', { expanded: false }).click()
  await sleepCard.getByLabel('Heures de sommeil moyennes par nuit').fill('7.5')
  await sleepCard.getByRole('button', { name: 'Enregistrer' }).click()

  // Reload: values must come back from the database, not just local state.
  await page.reload()
  const objectivesCardReloaded = page
    .getByRole('heading', { name: 'Objectifs & motivation' })
    .locator('xpath=ancestor::div[@data-slot="card"][1]')
  await expect(
    objectivesCardReloaded.getByLabel('Événement cible (mariage, compétition…)'),
  ).toHaveValue('Trail 20km')
  await expect(objectivesCardReloaded.getByLabel('Échéance visée')).toContainText('3 mois')

  const sleepCardReloaded = page
    .getByRole('heading', { name: 'Sommeil' })
    .locator('xpath=ancestor::div[@data-slot="card"][1]')
  await sleepCardReloaded.getByRole('button', { expanded: false }).click()
  await expect(
    sleepCardReloaded.getByLabel('Heures de sommeil moyennes par nuit'),
  ).toHaveValue('7.5')

  // Cleanup — don't leave the fixture account's coaching profile dirty for future runs.
  await objectivesCardReloaded
    .getByLabel('Événement cible (mariage, compétition…)')
    .fill('')
  await objectivesCardReloaded.getByLabel('Pourquoi maintenant ?').fill('')
  await objectivesCardReloaded.getByLabel('Échéance visée').click()
  await page.getByRole('option', { name: 'Non renseigné', exact: true }).click()
  await expect(objectivesCardReloaded.getByLabel('Échéance visée')).toContainText(
    'Non renseigné',
  )
  await objectivesCardReloaded.getByRole('button', { name: 'Enregistrer' }).click()

  await sleepCardReloaded.getByLabel('Heures de sommeil moyennes par nuit').fill('')
  await sleepCardReloaded.getByRole('button', { name: 'Enregistrer' }).click()
})
