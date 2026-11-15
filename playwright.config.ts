import { defineConfig, devices } from '@playwright/test'

/* ══════════════════════════════════════════════════════════════════════════════
   GATES 6, 7 AND 6b — end-to-end tests, accessibility assertions, and the
   second engine plus a phone.

   Both run against the **exported tree served the way a real host serves it**
   (`npm run serve`, the package's host-accurate static server), not against a
   development server. That is the point: the properties under test — trailing-slash
   resolution, the root-path redirect, a genuine 404 status — are properties of the
   export plus the serving layer, and a development server has different ones.

   A project per file pattern rather than one pattern for everything, so the chain
   can report gate 6, gate 7 and gate 6b separately, as the gate chain names them.

   ── GATE 6b — the second engine, and a phone ──────────────────────────────────
   `cross-chromium` is the control: an assertion that fails in WebKit and passes
   here is an engine finding; one that fails in both is a defect. `cross-webkit` is
   the engine axis — `browserslist` declares `safari >= 16.4` and this is its only
   gate. `cross-mobile` is the device axis: a named phone brings a mobile
   user-agent, touch input and a device pixel ratio — none of which a resized
   desktop window has. This site is 90 % portrait phones; they are the surface the
   cross gate exists for.
   ══════════════════════════════════════════════════════════════════════════════ */

const PORT = 4317
const BASE_URL = `http://127.0.0.1:${PORT}`

export default defineConfig({
  testDir: './tests/e2e',
  /* A static export is deterministic: the same input produces the same output, so a test
     that needs a retry to pass is a test that found something. No retries. */
  retries: 0,
  timeout: 90_000,
  fullyParallel: true,
  forbidOnly: true,
  reporter: process.env.CI === undefined ? [['list']] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },

  projects: [
    {
      name: 'e2e',
      testMatch: /.*\.e2e\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'a11y',
      testMatch: /.*\.a11y\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cross-chromium',
      testMatch: /.*\.cross\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'cross-webkit',
      testMatch: /.*\.cross\.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'cross-mobile',
      testMatch: /.*\.cross\.ts/,
      use: { ...devices['iPhone 15'] },
    },
  ],

  webServer: {
    /* Serves `out/`. The build is a separate gate that has already run by this point in
       the chain, so this does not rebuild — a webServer that ran the build would hide a
       broken build behind a passing e2e run. */
    command: 'npm run --silent serve',
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
