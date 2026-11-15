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
  /* The wordmark carries the page's visible name, so the h1 is structure rather
     than display: it is in the DOM and in the accessibility tree, hidden visually. */
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
  /* The audio-stripped video owes its text alternative: the configured
     `landing.videoLabel`, on the film itself. `getByRole` reads the
     accessibility tree, so resolving it is the role-and-name assertion. */
  await expect(page.getByRole('img', { name: /Endlosschleife/ })).toBeAttached()
  /* No user controls over the film, and no audio track to unmute. */
  const video = page.locator('video')
  await expect(video).toHaveAttribute('muted', '')
  await expect(video).not.toHaveAttribute('controls')
  /* The WP-03 seam, end to end: the configured logical path resolved through the
     manifest into the encoded variant, and the master's own opening frame as
     the poster — a resolved video with neither would be a poster-less black box. */
  await expect(video.locator('source')).toHaveCount(1)
  await expect(video.locator('source')).toHaveAttribute('src', /VID_20261114_082951-.*\.mp4/)
  await expect(video).toHaveAttribute('poster', /VID_20261114_082951-poster/)
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
