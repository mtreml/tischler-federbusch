import { expect, test } from '@playwright/test'

/* ══════════════════════════════════════════════════════════════════════════════
   GATE 6b — THE SAME EXPORT, READ BY ANOTHER ENGINE AND A PHONE.

   Deliberately small: the engine and the device are the axes under test, not the
   assertions. The landing is the document the site is, and it is the one the mobile
   surface must hold together.
   ══════════════════════════════════════════════════════════════════════════════ */

test('the landing serves and renders on this engine and device', async ({ page }) => {
  const response = await page.goto('/de/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})

test('the legal page serves on this engine and device', async ({ page }) => {
  const response = await page.goto('/de/impressum-datenschutz/')
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})
