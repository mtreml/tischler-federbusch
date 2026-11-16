import { z } from 'zod'

// Mirrors `legal.config.ts`. The impressum block reads `site.contact.*` at render time — not here.

export const legalSchema = z.object({
  /** German display string, e.g. "13. November 2026". Rendered verbatim. */
  lastChanged: z.string(),

  datenschutz: z.object({
    /** One text block; blank lines are paragraph breaks, rendered verbatim. */
    protocolText: z.string(),
  }),

  urheberrecht: z.string(),
})

export type LegalConfig = z.infer<typeof legalSchema>
