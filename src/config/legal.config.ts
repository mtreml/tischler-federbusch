import type { LegalConfig } from '@/lib/config/schema/legal.schema'

/* ══════════════════════════════════════════════════════════════════════════════
   LEGAL CONFIGURATION

   The legal page is data, rendered by a static view (WP-07) — no
   portfolio-core pattern re-used for it, per the spec.

   ── What this module does NOT hold ─────────────────────────────────────────────
   • The impressum block. It reads `site.contact.*` at render time — name,
     address, telephone and email live in exactly one place, and the legal
     page and the menu cannot disagree.
   • "Für den Inhalt verantwortlich" (→ `contact.name`) and the
     exercise-of-rights address (→ `contact.email`), resolved the same way.

   The professional review is still outstanding when the last field is filled
   — it is a launch gate on the finished text, and no build can discharge it.
   ══════════════════════════════════════════════════════════════════════════════ */

export const legal: LegalConfig = {
  /* Display string, German — rendered verbatim as "Zuletzt geändert: …". */
  lastChanged: '13. November 2026',

  /* ── 2. Datenschutzerklärung ──────────────────────────────────────────────────
     `responsible` is not a key here: it resolves to `site.contact.name` at
     render time, and so does the address the rights are exercised through. */
  datenschutz: {
    /* The web-server-protocol paragraph, verbatim from the spec. */
    processedData:
      'Der Webserver protokolliert jeden Abruf mit IP-Adresse, Zeitpunkt, abgerufener ' +
      'Adresse und der vom Browser übermittelten Programmkennung. Die Protokolle dienen ' +
      'ausschließlich dem sicheren Betrieb und der Fehlersuche.',

    /* IONOS GmbH, Germany, our Auftrag. `note` is the disclosure sentence
       verbatim; `provider` and `country` are the structured halves of the same
       fact, and validation keeps the sentence naming both of them. */
    hosting: {
      provider: 'IONOS GmbH',
      country: 'Deutschland',
      note:
        'Diese Website wird bei IONOS GmbH in Deutschland betrieben, der sie in unserem ' +
        'Auftrag bereitstellt und dabei die oben genannten Protokolldaten verarbeitet.',
    },

    /* "Speicherdauer: 60 Tage". */
    retentionDays: 60,

    /* The five GDPR rights, in the order the page renders them, exercised
       through `site.contact.email`. German working translation — the wording is
       confirmed before ship (01-open-questions.md), which is why the text is
       data here and not prose in a component: one edit per right, in one file. */
    rights: [
      {
        id: 'zugang',
        label: 'Auskunft',
        text: 'eine Kopie der personenbezogenen Daten, die wir über Sie führen, anzufordern.',
      },
      {
        id: 'berichtigung',
        label: 'Berichtigung',
        text: 'unrichtige oder unvollständige Daten berichtigen zu lassen.',
      },
      {
        id: 'loeschung',
        label: 'Löschung',
        text: 'die Löschung Ihrer Daten zu verlangen.',
      },
      {
        id: 'widerspruch',
        label: 'Widerspruch',
        text: 'sich gegen die Verarbeitung Ihrer Daten zur Wehr zu setzen.',
      },
      {
        id: 'widerruf',
        label: 'Widerruf der Einwilligung',
        text: 'eine erteilte Einwilligung jederzeit zu widerrufen.',
      },
    ],
  },

  /* ── 3. Urheberrecht ──────────────────────────────────────────────────────────
     The two sentences from the spec, verbatim. */
  urheberrecht:
    'Die Inhalte dieser Webseite unterliegen - soweit möglich - dem Urheberrecht. ' +
    'Jegliche Verwendung/Verbreitung von urheberrechtlich schützten Inhalten bedarf ' +
    'schriftlicher Zustimmung des Webseitenbetreibers.',
}
