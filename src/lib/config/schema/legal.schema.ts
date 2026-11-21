import { z } from 'zod'

import { localizedText } from './shared'

// Mirrors `legal.config.ts`. The impressum block reads `site.contact.*` at render time — not here.

export const legalSchema = z.object({
  /** Display string per locale, e.g. "13. November 2026". Rendered verbatim. */
  lastChanged: localizedText,

  datenschutz: z.object({
    /** One text block; blank lines are paragraph breaks, rendered verbatim. */
    protocolText: localizedText,
  }),

  urheberrecht: localizedText,
})

export type LegalConfig = z.infer<typeof legalSchema>
