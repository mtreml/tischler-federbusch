import type { SiteConfig } from '@/lib/config/schema/site.schema'

export const site: SiteConfig = {
  identity: {
    displayName: 'Lukas Federbusch',
    tagline: 'Handgemachte Möbel für Generationen.',
    /* Not a URL: the bare domain 301s to www; URLs are built from canonicalOrigin. */
    domain: 'tischler-federbusch.at',
    canonicalOrigin: 'https://www.tischler-federbusch.at',
  },

  languages: {
    supported: ['de'],
    default: 'de',
  },

  routes: {
    home: '/',
    impressum: {
      de: 'impressum-datenschutz',
    },
    anchors: {
      arbeiten: 'arbeiten',
    },
  },

  // THE ONE PLACE CONTACT DETAILS EXIST: menu, footer and legal page all read them here.
  contact: {
    name: 'Lukas Federbusch',
    addressLines: ['Hochschoberstraße 12, Top 16', '9900 Lienz'],
    phoneDisplay: '0664 410 72 72',
    phoneHref: '+436644107272',
    email: 'lukas.federbusch@gmail.com',
  },

  footer: {
    legalLabel: 'Impressum & Datenschutz',
    credit: 'mtreml',
    creditUrl: 'https://github.com/mtreml',
  },

  seo: {
    title: 'Federbusch | Tischlermeister',
    titleTemplate: '%s — Lukas Federbusch',
    defaultDescription: 'Handgemachte Möbel für Generationen — Lukas Federbusch, Lienz.',
    structuredDataType: 'Person',
    ogImage: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
  },

  landing: {
    // The pipeline keeps the original's logical path, so this is the original's path, not a `master.mp4`; validate-config cross-checks it.
    video: '/media/landing/VID_20261114_082951.mp4',
    introDurationMs: 1500,
    videoLabel:
      'Lukas Federbusch bearbeitet Holz in seiner Werkstatt. Das Video läuft ohne Ton in einer Endlosschleife.',
    objectFit: 'cover',
  },

  works: {
    // The works images in display order; `seo.ogImage` names one of them and validate-config keeps that honest.
    images: [
      {
        image: '/media/arbeiten/9ezd7rz08i9h1.jpg',
        imageAlt: 'Handgefertigtes Möbelstück von Lukas Federbusch',
      },
      {
        image: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
        imageAlt: 'Handgefertigte Kommode von Lukas Federbusch',
      },
      {
        image: '/media/arbeiten/yz50v4rlf8be1.jpg',
        imageAlt: 'Handgefertigtes Möbelstück von Lukas Federbusch',
      },
    ],
  },

  navigation: {
    items: [
      { type: 'anchor', anchor: 'arbeiten', label: 'Arbeiten' },
      { type: 'tel' },
      { type: 'email' },
    ],
  },
}
