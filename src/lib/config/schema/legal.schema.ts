import { z } from 'zod'

import { checkedString, isAnchorId } from './shared'

// Mirrors `legal.config.ts`. The impressum identity block and the privacy
// policy's responsible/email lines read `site.contact.*` at render time — not here.

// The labels are working translations; wording confirmed before ship (see `legal.config.ts`).
const gdprRight = z.object({
  /** Stable key, used as a `data-` attribute and by tests — never shown. */
  id: checkedString(isAnchorId, 'must be a lowercase id'),
  label: z.string(),
  text: z.string(),
})

export const legalSchema = z.object({
  /** German display string, e.g. "13. November 2026". Rendered verbatim. */
  lastChanged: z.string(),

  datenschutz: z.object({
    processedData: z.string(),
    hosting: z.object({
      provider: z.string(),
      country: z.string(),
      /** Must name `provider` and `country` — cross-checked in `../validate.ts`. */
      note: z.string(),
    }),
    retentionDays: z.number().int().min(0),
    /** The five GDPR rights, in render order. */
    rights: z.array(gdprRight),
  }),

  urheberrecht: z.string(),
})

export type LegalConfig = z.infer<typeof legalSchema>
