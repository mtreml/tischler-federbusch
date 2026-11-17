/* ══════════════════════════════════════════════════════════════════════════════
   LINK CHECK — a stub; the real implementation lands later.

   Reads the EXPORT, not the source: every internal href in every emitted document
   must resolve to a file the export actually writes, and the trailing-slash rule
   must hold in the emitted markup. The real implementation adds that walk over `out/`; the stub
   keeps the gate in the chain at its fixed position (after the build) so the order
   never moves.
   ══════════════════════════════════════════════════════════════════════════════ */
import { existsSync } from 'node:fs'
import { join } from 'node:path'

if (!existsSync(join(process.cwd(), 'out', 'de', 'index.html'))) {
  console.error('links:check: no export found at out/de/index.html — run the build first')
  process.exit(1)
}

console.log('links:check: OK (stub — the exported tree is present; the href walk lands later)')
