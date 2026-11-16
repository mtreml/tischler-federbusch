import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

/* ══════════════════════════════════════════════════════════════════════════════
   GATE 7 — ACCESSIBILITY, ON THE EXPORT AS SERVED

   The pages the skeleton has today. `prefers-reduced-motion` and the menu/transition
   assertions join this gate as the surfaces land.
   ══════════════════════════════════════════════════════════════════════════════ */

const PAGES = ['/de/', '/de/impressum-datenschutz/']

for (const path of PAGES) {
  test(`no serious or critical violations on ${path}`, async ({ page }) => {
    await page.goto(path)
    const results = await new AxeBuilder({ page }).analyze()
    expect(
      results.violations.filter((violation) =>
        ['critical', 'serious'].includes(violation.impact ?? ''),
      ),
    ).toEqual([])
  })
}
