import { expect, test } from '@playwright/test'

// The routes, on the export as served: the documents exist, the root path reaches them, an unmatched path gets a genuine 404.

test('the landing renders at /de/', async ({ page }) => {
  const response = await page.goto('/de/')
  expect(response?.status()).toBe(200)
  // The h1 is structure, not display: present in the DOM, hidden visually.
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached()
  await expect(page.getByRole('img', { name: /Endlosschleife/ })).toBeAttached()
  const video = page.locator('video')
  await expect(video).toHaveAttribute('muted', '')
  await expect(video).not.toHaveAttribute('controls')
  await expect(video.locator('source')).toHaveCount(1)
  await expect(video.locator('source')).toHaveAttribute('src', /VID_20261114_082951-.*\.mp4/)
  await expect(video).toHaveAttribute('poster', /VID_20261114_082951-poster/)
})

test('the works section anchors below the landing in the one document', async ({ page }) => {
  await page.goto('/de/')
  const section = page.locator('#arbeiten')
  await expect(section).toBeAttached()
  await expect(section.getByText('Handgemachte Möbel für Generationen.')).toBeAttached()
  // Intrinsic dimensions reserve the box (CLS ≈ 0).
  const image = section.locator('picture img')
  const firstSource = section.locator('picture source').first()
  await expect(firstSource).toHaveAttribute('type', 'image/avif')
  await expect(firstSource).toHaveAttribute(
    'srcset',
    /signal-2026-07-20-20-14-59-447_003-\w+-\d+\.avif \d+w/,
  )
  await expect(image).toHaveAttribute('src', /signal-2026-07-20-20-14-59-447_003-\w+-\d+\.jpeg$/)
  await expect(image).toHaveAttribute('width', /\d+/)
  await expect(image).toHaveAttribute('height', /\d+/)
})

test('the menu entry lands on the works section', async ({ page }) => {
  await page.goto('/de/')
  await page.getByRole('button', { name: 'Menü öffnen' }).click()
  const entry = page.getByRole('link', { name: 'Arbeiten' })
  await expect(entry).toBeVisible()
  await entry.click()
  await expect
    .poll(async () =>
      page
        .locator('#arbeiten')
        .evaluate((element) => Math.abs(element.getBoundingClientRect().top)),
    )
    .toBeLessThanOrEqual(4)
})

test('the footer line closes the one-scroll document', async ({ page }) => {
  await page.goto('/de/')
  const footer = page.locator('footer')
  await expect(footer.getByText(/© \d{4} Lukas Federbusch/)).toBeVisible()
  await expect(footer.getByText('Made with care & love by')).toBeVisible()

  const legalLink = footer.getByRole('link', { name: 'Impressum & Datenschutz' })
  await expect(legalLink).toHaveAttribute('href', /\/de\/impressum-datenschutz\/?$/)
  await expect(legalLink).not.toHaveAttribute('data-transition')

  const credit = footer.getByRole('link', { name: 'mtreml' })
  await expect(credit).toHaveAttribute('href', 'https://github.com/mtreml')
  await expect(credit).toHaveAttribute('target', '_blank')
  await expect(credit).toHaveAttribute('rel', 'noreferrer')

  await expect(footer.locator('a[href^="tel:"]')).toHaveCount(0)
  await expect(footer.locator('a[href^="mailto:"]')).toHaveCount(0)
})

test('the footer legal entry navigates plainly — no overlay in the DOM', async ({ page }) => {
  await page.goto('/de/')
  const legalLink = page.locator('footer').getByRole('link', { name: 'Impressum & Datenschutz' })
  await legalLink.click()
  await expect(page).toHaveURL(/\/de\/impressum-datenschutz\/$/)
  await expect(page.locator('.transition-overlay')).toHaveCount(0)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Impressum & Datenschutz' }),
  ).toBeVisible()
})

test('the legal page renders at /de/impressum-datenschutz/', async ({ page }) => {
  const response = await page.goto('/de/impressum-datenschutz/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the legal page renders the configured text, with its header', async ({ page }) => {
  await page.goto('/de/impressum-datenschutz/')

  await expect(page.getByRole('button', { name: 'Menü öffnen' })).toBeVisible()

  await expect(
    page.getByRole('heading', { level: 1, name: 'Impressum & Datenschutz' }),
  ).toBeVisible()
  expect(await page.getByRole('heading', { level: 2 }).allTextContents()).toEqual([
    '1. Impressum',
    '2. Datenschutzerklärung',
    '3. Urheberrecht',
  ])

  await expect(page.getByText('Zuletzt geändert: 16. November 2026')).toBeVisible()

  await expect(page.getByText('Hochschoberstraße 12, Top 16')).toBeVisible()
  await expect(page.getByText('9900 Lienz')).toBeVisible()
  await expect(page.getByRole('link', { name: '0664 410 72 72' })).toHaveAttribute(
    'href',
    'tel:+436644107272',
  )
  await expect(page.getByRole('link', { name: 'lukas.federbusch@gmail.com' })).toHaveCount(2)

  await expect(
    page.getByText('ausschließlich dem sicheren Betrieb der Webseite und der Fehlersuche.'),
  ).toBeVisible()
  await expect(
    page.getByText(
      'Diese Webseite wird auf einem Server von IONOS GmbH in Deutschland bereitstellt. Dabei werden die oben genannten Protokolldaten verarbeitet.',
    ),
  ).toBeVisible()
  await expect(page.getByText('Protokolldaten werden 60 Tage lang gespeichert.')).toBeVisible()
  for (const label of [
    'Auskunft',
    'Berichtigung',
    'Löschung',
    'Widerspruch',
    'Widerruf der Einwilligung',
  ]) {
    await expect(page.getByText(label)).toBeVisible()
  }

  await expect(
    page.getByText(
      'Die Inhalte dieser Webseite unterliegen - soweit möglich - dem Urheberrecht. Jegliche Verwendung/Verbreitung von urheberrechtlich schützten Inhalten bedarf schriftlicher Zustimmung des Webseitenbetreibers.',
    ),
  ).toBeVisible()
})

test('the documents carry their title, description and canonical', async ({ page }) => {
  await page.goto('/de/')
  await expect(page).toHaveTitle('Handgemachte Möbel für Generationen. — Lukas Federbusch')
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    'content',
    'Handgemachte Möbel für Generationen — Lukas Federbusch, Lienz.',
  )
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.tischler-federbusch.at/de/',
  )
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
    'content',
    /signal-2026-07-20-20-14-59-447_003\.jpg$/,
  )

  await page.goto('/de/impressum-datenschutz/')
  await expect(page).toHaveTitle('Impressum & Datenschutz — Lukas Federbusch')
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://www.tischler-federbusch.at/de/impressum-datenschutz/',
  )
})

test('the root path reaches the default locale with scripting disabled', async ({ browser }) => {
  // With scripting disabled the meta refresh still fires; the link is the fallback.
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
