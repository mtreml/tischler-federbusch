import type { SiteConfig } from '@/lib/config/schema/site.schema'

/* ══════════════════════════════════════════════════════════════════════════════
   SITE CONFIGURATION — the file every other module reads first.

   Every value that is specific to THIS site is here, in `legal.config.ts`, in
   `media.config.ts` or in `tokens.css` — and nowhere else. No component outside
   `src/config` carries a contact detail, a colour or a piece of geometry.

   ── What this file does NOT hold ───────────────────────────────────────────────
   • The locale set as a second copy. `i18n/routing.ts` derives `locales` and
     `defaultLocale` from `languages.*` below.
   • The copyright holder. The footer resolves it to `contact.name` at render
     time, so there is no second name to keep in step.
   • Design values. Colour, type scale, spacing, breakpoints, the name
     geometry and the easing family are in `tokens.css`.
   ══════════════════════════════════════════════════════════════════════════════ */

export const site: SiteConfig = {
  /* ── Identity ───────────────────────────────────────────────────────────────── */
  identity: {
    displayName: 'Lukas Federbusch',
    tagline: 'Handgemachte Möbel für Generationen.',
    /* The bare domain is not a URL: it 301s to the www one at the server level
      , and every URL this site emits is built from canonicalOrigin. */
    domain: 'tischler-federbusch.at',
    canonicalOrigin: 'https://www.tischler-federbusch.at',
  },

  /* ── Languages ─────────────────────────────────────────────────────────────────
     German only, by decision: one configured locale, no visible switch. The
     machinery carries the prefix and the map, so a second locale later is a
     configuration change, not an architecture one. */
  languages: {
    supported: ['de'],
    default: 'de',
  },

  /* ── Routes ────────────────────────────────────────────────────────────────────
     `impressum` is a per-locale map; on this site the segment is untranslated,
     so every locale carries the same value. `anchors` names the on-page
     targets a menu entry may point at — there is exactly one of them. */
  routes: {
    home: '/',
    impressum: {
      de: 'impressum-datenschutz',
    },
    anchors: {
      arbeiten: 'arbeiten',
    },
  },

  /* ── Contact ───────────────────────────────────────────────────────────────────
     THE ONE PLACE CONTACT DETAILS EXIST. The menu, the footer
     and the legal page all read them here, so they cannot disagree. */
  contact: {
    name: 'Lukas Federbusch',
    addressLines: ['Hochschoberstraße 12, Top 16', '9900 Lienz'],
    /* The human form, as it appears in the menu. */
    phoneDisplay: '0664 410 72 72',
    /* The tel: target. Domestic 0664 410 72 72, as +43 664 410 72 72. */
    phoneHref: '+436644107272',
    /* The mailto: target, and the display text of the email menu entry. */
    email: 'lukas.federbusch@gmail.com',
  },

  /* ── Footer ────────────────────────────────────────────────────────────────────
     © {contact.name}    {legalLabel} → the legal route    Website von {credit}

     The legal entry is a **plain link with plain navigation** — no transition
     overlay. The credit link is external; its `rel` is the renderer's
     business, not a value here. */
  footer: {
    legalLabel: 'Impressum & Datenschutz',
    credit: 'mtreml',
    creditUrl: 'https://github.com/mtreml',
  },

  /* ── SEO ───────────────────────────────────────────────────────────────────────
     German by decision — the site has one locale, so the strings are plain. */
  seo: {
    /* The subject's own name, appended once to every document title: a page
       supplies only its own title and never repeats it. */
    titleTemplate: '%s — Lukas Federbusch',
    defaultDescription: 'Handgemachte Möbel für Generationen — Lukas Federbusch, Lienz.',
    structuredDataType: 'Person',
    /* The Works image, as a logical path under `media.basePath` —
       signal-2026-07-20-20-14-59-447_003.jpg, the full-size rung of its ladder. */
    ogImage: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
  },

  /* ── Landing ───────────────────────────────────────────────────────────────────
     The autoplaying, looping master. The encode strips the audio, which
     is why a muted video still owes its text alternative. */
  landing: {
    /* Logical path of the encoded master under `media.basePath`. The pipeline
       keeps the original's logical path — the encoded file is the declared
       master itself, only a content-hash suffix apart, which is why
       this value is the original's path and not a `master.mp4` that nothing is
       ever served at. The `validate-config` cross-check resolves this
       against `declaredMedia()`, so the two cannot disagree again. */
    video: '/media/landing/VID_20261114_082951.mp4',
    /* The intro — video deblur plus logo/name fade-in, at the same rate — in
       one figure. 1.5 s, after which the video plays on repeat. */
    introDurationMs: 1500,
    /* The a11y text alternative for the audio-stripped video. */
    videoLabel:
      'Lukas Federbusch bearbeitet Holz in seiner Werkstatt. Das Video läuft ohne Ton in einer Endlosschleife.',
    objectFit: 'cover',
  },

  /* ── Works ───────────────────────────────────────────────────────────────────
     The works section renders this image, and `seo.ogImage` is its
     social-share copy: the two keys name the same one file, and the
     `validate-config` cross-check keeps them honest. The heading is not a
     key here — it resolves to the menu entry's label, so the word is
     declared once. */
  works: {
    /* The responsive Works image, as a logical path under `media.basePath` —
       the same file `seo.ogImage` names. */
    image: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
    /* The text alternative of the image, as it renders. */
    imageAlt: 'Handgefertigte Kommode von Lukas Federbusch',
  },

  /* ── Navigation ─────────────────────────────────────────────────────────────────
     The menu item list, in the order the menu renders it — the menu renders
     this list and nothing else. The two contact entries carry no label of
     their own: they resolve their display text and their target from
     `contact` at render time, so there is no second copy of either. */
  navigation: {
    items: [
      { type: 'anchor', anchor: 'arbeiten', label: 'Arbeiten' },
      { type: 'tel' },
      { type: 'email' },
    ],
  },
}
