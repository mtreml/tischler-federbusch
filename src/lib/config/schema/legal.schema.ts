import { z } from 'zod'

import { checkedString, isAnchorId } from './shared'

/* ══════════════════════════════════════════════════════════════════════════════
   LEGAL CONFIGURATION SCHEMA — mirrors `src/config/legal.config.ts`.

   The legal page is data, rendered by a static view (WP-07). No portfolio-core
   pattern is re-used for it, per the spec.

   ── What this module does NOT hold ─────────────────────────────────────────────
   • The impressum identity block. It reads `site.contact.*` at render time —
     name, address, telephone and email live in exactly one place and nowhere
     here, so the legal page and the menu cannot disagree.
   • The privacy policy's "responsible" line (→ `contact.name`) and its
     exercise-of-rights address (→ `contact.email`), resolved the same way.
   ══════════════════════════════════════════════════════════════════════════════ */

/**
 * One GDPR right as a German label plus its text. The labels are working
 * translations; the wording is confirmed before ship (see the open-questions
 * note on `rights` in `legal.config.ts`).
 */
const gdprRight = z.object({
  /** Stable key, used as a `data-` attribute and by the tests — never shown. */
  id: checkedString(isAnchorId, 'must be a lowercase id'),
  label: z.string(),
  text: z.string(),
})

export const legalSchema = z.object({
  /** Display string, German — e.g. "13. November 2026". Rendered verbatim. */
  lastChanged: z.string(),

  datenschutz: z.object({
    /** The web-server-protocol paragraph, verbatim from the spec. */
    processedData: z.string(),
    hosting: z.object({
      /** The processor, named. */
      provider: z.string(),
      /** Its seat, as it is disclosed. */
      country: z.string(),
      /**
       * The disclosure sentence, verbatim. Must name `provider` and `country` —
       * that is a cross-check in `../validate.ts`, because the sentence and the
       * fields are one fact and two copies.
       */
      note: z.string(),
    }),
    /** The retention figure in days, as it is disclosed. */
    retentionDays: z.number().int().min(0),
    /** The five GDPR rights, in the order the page renders them. */
    rights: z.array(gdprRight),
  }),

  /** The copyright notice, verbatim from the spec. */
  urheberrecht: z.string(),
})

export type LegalConfig = z.infer<typeof legalSchema>
