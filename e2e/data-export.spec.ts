import { expect, test } from '@playwright/test'

test.use({ storageState: 'e2e/.auth/user.json' })

test('downloads a JSON export with the expected shape', async ({ page }) => {
  await page.goto('/profile')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Exporter mes données' }).click()
  const download = await downloadPromise

  expect(download.suggestedFilename()).toMatch(/^fitness-export-\d{4}-\d{2}-\d{2}\.json$/)

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  for await (const chunk of stream) chunks.push(chunk as Buffer)
  const content = JSON.parse(Buffer.concat(chunks).toString('utf-8')) as Record<
    string,
    unknown
  >

  expect(content.schema_version).toBe(1)
  expect(typeof content.exported_at).toBe('string')
  expect(content.profile).toBeTruthy()
  expect(content.coaching_profile).toBeTruthy()
  for (const key of [
    'weight_entries',
    'exercises',
    'programs',
    'session_templates',
    'session_template_exercises',
    'session_logs',
    'session_log_sets',
  ]) {
    expect(Array.isArray(content[key])).toBe(true)
  }
  // Never export the API key vault — not present as a top-level field at all.
  expect(content).not.toHaveProperty('ai_provider_keys')
})
