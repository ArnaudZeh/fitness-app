import { expect, test } from '@playwright/test'

test('redirects an unauthenticated visitor to /login', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('heading', { name: 'Connexion' })).toBeVisible()
})

test('shows an inline error on invalid login credentials', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Email').fill('does-not-exist@example.com')
  await page.getByLabel('Mot de passe').fill('wrong-password-123')
  await page.getByRole('button', { name: 'Se connecter' }).click()

  await expect(page.getByRole('alert')).toHaveText('Email ou mot de passe incorrect.')
})

test('blocks signup submission when the password is too short', async ({ page }) => {
  await page.goto('/signup')
  await page.getByLabel('Email').fill('someone@example.com')
  await page.getByLabel('Mot de passe').fill('short')
  await page.getByRole('button', { name: 'Créer le compte' }).click()

  // Native HTML5 minLength validation blocks the submit — no request is sent,
  // so we're still on the form (not the "check your email" screen).
  await expect(page.getByRole('heading', { name: 'Créer un compte' })).toBeVisible()
})
