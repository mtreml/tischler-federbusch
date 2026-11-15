/* ══════════════════════════════════════════════════════════════════════════════
   GATE 1 — configuration validation.

     npm run config:validate            development severity — warns and lists
     npm run config:validate:strict     production severity — fails and names

   ── Why the severity is an argument rather than an inference ────────────────────
   `next build` sets `NODE_ENV=production` for its own process, but this script
   runs *before* it, in a process where nothing has set it. Inferring from
   `NODE_ENV` alone would therefore read every gate run as "development" and
   the production build would pass a check it should have failed — the one
   failure mode this gate exists to prevent. So `prebuild` and the gate chain
   pass `--production` explicitly, and a bare invocation stays at development
   severity on purpose: that is the call a developer makes, and warning is the
   documented behaviour for it.

   The checks, in one entry point (`src/lib/config/validate.ts`):
     • the zod schema of each module — shape and format, failing everywhere;
     • the required-field layer — an empty required value, named by key;
     • the cross-key rules — the phone display form against its `tel:` target,
       the locale set against the route segments, the hosting sentence against
       its provider and country, the menu against the anchors it names;
     • the token file's one invariant — exactly one background definition.
   ══════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { legal } from '@/config/legal.config'
import { media } from '@/config/media.config'
import { site } from '@/config/site.config'
import { formatReport, validateConfiguration, type Environment } from '@/lib/config/validate'

const strict = process.argv.includes('--production')
const environment: Environment = strict ? 'production' : 'development'

/* Read here rather than inside the validator: a CSS file is not a module, and
   the validator also stays importable from anywhere that has no filesystem. */
const tokenSource = readFileSync(join(process.cwd(), 'src', 'config', 'tokens.css'), 'utf8')

const report = validateConfiguration({ site, legal, media, environment, tokenSource })

process.stdout.write(`${formatReport(report)}\n`)

if (!report.ok) {
  process.stdout.write(`\n${report.errors.length} error(s). Gate 1 failed.\n`)
  process.exit(1)
}

if (report.warnings.length > 0) {
  process.stdout.write(
    `\n${report.warnings.length} warning(s). This list is the outstanding-data checklist; ` +
      'the production build will fail until it is empty.\n',
  )
}
