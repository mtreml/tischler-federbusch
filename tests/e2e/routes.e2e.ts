import { expect, test } from '@playwright/test'

/* ══════════════════════════════════════════════════════════════════════════════
   GATE 6 — THE ROUTES, ON THE EXPORT AS SERVED

   WP-01 proves the skeleton end to end: the two documents exist, the root path
   reaches them, and an unmatched path gets a genuine 404. The design assertions
   (the landing, the menu, the transition) join this gate as WP-05 and WP-06 land.
   ══════════════════════════════════════════════════════════════════════════════ */

test('the landing renders at /de/', async ({ page }) => {
  const response = await page.goto('/de/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the legal page renders at /de/impressum-datenschutz/', async ({ page }) => {
  const response = await page.goto('/de/impressum-datenschutz/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the root path reaches the default locale with scripting disabled', async ({ browser }) => {
  /* The redirect document carries both halves: a meta refresh and a real link. With
     scripting disabled the meta refresh still fires (it is not scripting), and the
     link is the fallback for a browser that declines it. */
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  await page.goto('/')
  await expect.poll(() => page.url(), { timeout: 10_000 }).toContain('/de/')
  await context.close()
})

test('an unmatched path gets a genuine 404 with the not-found document', async ({ page }) => {
  const response = await page.goto('/de/does-not-exist/')
  expect(response?.status()).toBe(404)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
