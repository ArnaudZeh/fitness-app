import { expect, test } from '@playwright/test'

// Needs two real, independently-authenticated sessions to exercise a
// request/accept flow — the default fixture (page) sends the request, a
// second browser context (authenticated separately via user2.json) plays
// the addressee. See auth.setup.ts for how both storage states are built.
test.use({ storageState: 'e2e/.auth/user.json' })

function waitForFriendshipsRequest(page: import('@playwright/test').Page, method: string) {
  return page.waitForResponse(
    (response) =>
      response.request().method() === method && response.url().includes('/rest/v1/friendships'),
  )
}

test('sends, accepts, and removes a friend request between two accounts', async ({
  page,
  browser,
}) => {
  const context2 = await browser.newContext({ storageState: 'e2e/.auth/user2.json' })
  const page2 = await context2.newPage()

  try {
    await page.goto('/friends')
    const searchCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: "Trouver quelqu'un" }) })
    await searchCard.getByPlaceholder('Rechercher par nom…').fill('E2E Fixture 2')
    const searchResult = searchCard.locator('li').filter({ hasText: 'E2E Fixture 2' })
    await expect(searchResult).toBeVisible({ timeout: 10_000 })
    // click() only waits for the event to dispatch, not for the insert it
    // triggers — reloading right after would race the request and can
    // cancel it mid-flight (same class of bug found earlier in
    // social.spec.ts's weight-goal cleanup), so wait for the real response.
    await Promise.all([
      waitForFriendshipsRequest(page, 'POST'),
      searchResult.getByRole('button', { name: 'Ajouter' }).click(),
    ])

    // Confirm the request actually landed server-side before switching to
    // the other account — a reload forces a fresh fetch rather than trusting
    // an optimistic UI state that may not have round-tripped yet.
    await page.reload()
    const outgoingCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Demandes envoyées' }) })
    await expect(outgoingCard.getByText('E2E Fixture 2')).toBeVisible({ timeout: 10_000 })

    await page2.goto('/friends')
    const incomingCard = page2
      .locator('[data-slot="card"]')
      .filter({ has: page2.getByRole('heading', { name: 'Demandes reçues' }) })
    await expect(incomingCard.getByText('E2E Fixture 1')).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      waitForFriendshipsRequest(page2, 'PATCH'),
      incomingCard.getByRole('button', { name: 'Accepter' }).click(),
    ])

    const friendsCard2 = page2
      .locator('[data-slot="card"]')
      .filter({ has: page2.getByRole('heading', { name: 'Mes amis' }) })
    await expect(friendsCard2.getByText('E2E Fixture 1')).toBeVisible({ timeout: 10_000 })

    // The requester's side should reflect the acceptance too.
    await page.reload()
    const friendsCard1 = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Mes amis' }) })
    await expect(friendsCard1.getByText('E2E Fixture 2')).toBeVisible({ timeout: 10_000 })

    // Cleanup: remove the friendship from account 1's side so the fixture
    // accounts start the next run with no lingering relationship. Same
    // "wait for the real response" discipline as above — the confirm
    // dialog's own await isn't enough to stop Playwright's click() from
    // resolving before the DELETE actually reaches the network.
    await friendsCard1.getByRole('button', { name: 'Retirer cet ami' }).click()
    await Promise.all([
      waitForFriendshipsRequest(page, 'DELETE'),
      page.getByRole('button', { name: 'Retirer', exact: true }).click(),
    ])
    await expect(friendsCard1.getByText('E2E Fixture 2')).toHaveCount(0)
  } finally {
    await context2.close()
  }
})

test('declining a friend request removes it for both sides', async ({ page, browser }) => {
  const context2 = await browser.newContext({ storageState: 'e2e/.auth/user2.json' })
  const page2 = await context2.newPage()

  try {
    await page.goto('/friends')
    const searchCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: "Trouver quelqu'un" }) })
    await searchCard.getByPlaceholder('Rechercher par nom…').fill('E2E Fixture 2')
    const searchResult = searchCard.locator('li').filter({ hasText: 'E2E Fixture 2' })
    await expect(searchResult).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      waitForFriendshipsRequest(page, 'POST'),
      searchResult.getByRole('button', { name: 'Ajouter' }).click(),
    ])

    await page2.goto('/friends')
    const incomingCard = page2
      .locator('[data-slot="card"]')
      .filter({ has: page2.getByRole('heading', { name: 'Demandes reçues' }) })
    await expect(incomingCard.getByText('E2E Fixture 1')).toBeVisible({ timeout: 10_000 })
    await Promise.all([
      waitForFriendshipsRequest(page2, 'DELETE'),
      incomingCard.getByRole('button', { name: 'Refuser' }).click(),
    ])
    await expect(incomingCard).toHaveCount(0)

    // No lingering request on the requester's side either — declining
    // deletes the row rather than leaving it in some "declined" limbo.
    await page.reload()
    const outgoingCard = page
      .locator('[data-slot="card"]')
      .filter({ has: page.getByRole('heading', { name: 'Demandes envoyées' }) })
    await expect(outgoingCard).toHaveCount(0)
  } finally {
    await context2.close()
  }
})
