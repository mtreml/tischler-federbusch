import type { LegalConfig } from '@/lib/config/schema/legal.schema'

/* ══════════════════════════════════════════════════════════════════════════════
   LEGAL CONFIGURATION

   The legal page is data, rendered by a static view — no
   portfolio-core pattern re-used for it, per the spec.

   ── What this module does NOT hold ─────────────────────────────────────────────
   • The impressum block. It reads `site.contact.*` at render time — name,
     address, telephone and email live in exactly one place, and the legal
     page and the menu cannot disagree.

   The professional review is still outstanding when the last field is filled
   — it is a launch gate on the finished text, and no build can discharge it.
   ══════════════════════════════════════════════════════════════════════════════ */

export const legal: LegalConfig = {
  /* Display string, German — rendered verbatim as "Zuletzt geändert: …". */
  lastChanged: '16. November 2026',

  /* ── 2. Datenschutzerklärung ──────────────────────────────────────────────────
     The protocol/hosting/retention text as one block; the blank lines are
     paragraph breaks, rendered verbatim. */
  datenschutz: {
    protocolText:
      'Der Webserver protokolliert jeden Abruf mit IP-Adresse, Zeitpunkt, und der vom ' +
      'Browser übermittelten Programmkennung. Die Protokolle dienen ausschließlich ' +
      'dem sicheren Betrieb der Webseite und der Fehlersuche.\n\n' +
      'Diese Webseite wird auf einem Server von IONOS GmbH in Deutschland bereitstellt. ' +
      'Dabei werden die oben genannten Protokolldaten verarbeitet.\n\n' +
      'Protokolldaten werden 60 Tage lang gespeichert.',
  },

  /* ── 3. Urheberrecht ──────────────────────────────────────────────────────────
     The two sentences from the spec, verbatim. */
  urheberrecht:
    'Die Inhalte dieser Webseite unterliegen - soweit möglich - dem Urheberrecht. ' +
    'Jegliche Verwendung/Verbreitung von urheberrechtlich schützten Inhalten bedarf ' +
    'schriftlicher Zustimmung des Webseitenbetreibers.',
}
