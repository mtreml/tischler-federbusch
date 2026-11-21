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
  lastChanged: {
    de: '16. November 2026',
    en: '16 November 2026',
  },

  /* ── 2. Datenschutzerklärung ──────────────────────────────────────────────────
     The protocol/hosting/retention text as one block; the blank lines are
     paragraph breaks, rendered verbatim. */
  datenschutz: {
    protocolText: {
      de:
        'Der Webserver protokolliert jeden Abruf mit IP-Adresse, Zeitpunkt, und der vom ' +
        'Browser übermittelten Programmkennung. Die Protokolle dienen ausschließlich ' +
        'dem sicheren Betrieb der Webseite und der Fehlersuche.\n\n' +
        'Diese Webseite wird auf einem Server von IONOS GmbH in Deutschland bereitstellt. ' +
        'Dabei werden die oben genannten Protokolldaten verarbeitet.\n\n' +
        'Protokolldaten werden 60 Tage lang gespeichert.',
      en:
        'The web server logs every request with the IP address, the time, and the ' +
        'app identification data sent by the browser. The logs are used solely for the secure ' +
        'operation of the website and for troubleshooting.\n\n' +
        'This website is hosted on a server operated by IONOS GmbH in Germany. ' +
        'The log data mentioned above is processed there.\n\n' +
        'Log data is stored for 60 days.',
    },
  },

  /* ── 3. Urheberrecht ──────────────────────────────────────────────────────────
     The two sentences from the spec, verbatim. */
  urheberrecht: {
    de:
      'Die Inhalte dieser Webseite unterliegen - soweit möglich - dem Urheberrecht. ' +
      'Jegliche Verwendung/Verbreitung von urheberrechtlich schützten Inhalten bedarf ' +
      'schriftlicher Zustimmung des Webseitenbetreibers.',
    en:
      'The contents of this website are - as far as possible - subject to copyright. ' +
      'Any use or distribution of copyrighted content requires the written consent ' +
      'of the website operator.',
  },
}
