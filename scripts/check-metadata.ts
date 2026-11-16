/* ══════════════════════════════════════════════════════════════════════════════
   METADATA CHECK — a stub; the real implementation lands later.

   Every property it will assert — a title per document, the canonical URL, the
   sitemap, the crawler policy — is a property of the EMITTED document, which is why
   the gate sits after the build. The real implementation adds the assertions; the stub keeps
   the gate in the chain at its fixed position so the order never moves.
   ══════════════════════════════════════════════════════════════════════════════ */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

const required = [
  'de/index.html',
  'de/impressum-datenschutz/index.html',
  'robots.txt',
  'sitemap.xml',
]
for (const path of required) {
  if (!existsSync(join(process.cwd(), 'out', path))) {
    console.error(`meta:check: the export is missing ${path} — run the build first`)
    process.exit(1)
  }
}

console.log(
  'meta:check: OK (stub — the export carries the expected documents; the metadata assertions land later)',
)
