import type { SiteConfig } from '@/lib/config/schema/site.schema'

export const site: SiteConfig = {
  identity: {
    displayName: 'Lukas Federbusch',
    tagline: {
      de: 'Handgemachte Möbel für Generationen.',
      en: 'Handmade furniture for generations.',
    },
    /* Not a URL: the bare domain 301s to www; URLs are built from canonicalOrigin. */
    domain: 'tischler-federbusch.at',
    canonicalOrigin: 'https://www.tischler-federbusch.at',
  },

  languages: {
    supported: ['de', 'en'],
    default: 'de',
  },

  routes: {
    home: '/',
    impressum: {
      de: 'impressum-datenschutz',
      en: 'impressum-datenschutz',
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
    legalLabel: {
      de: 'Impressum & Datenschutz',
      en: 'Legal Notice & Privacy',
    },
    credit: 'mtreml',
    creditUrl: 'https://github.com/mtreml',
  },

  seo: {
    title: {
      de: 'Federbusch | Tischlermeister',
      en: 'Federbusch | Master Cabinetmaker',
    },
    titleTemplate: '%s — Lukas Federbusch',
    defaultDescription: {
      de: 'Handgemachte Möbel für Generationen — Lukas Federbusch, Lienz.',
      en: 'Handmade furniture for generations — Lukas Federbusch, Lienz.',
    },
    structuredDataType: 'Person',
    ogImage: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
  },

  landing: {
    // The pipeline keeps the original's logical path, so this is the original's path, not a `master.mp4`; validate-config cross-checks it.
    video: '/media/landing/VID_20261114_082951.mp4',
    introDurationMs: 1500,
    videoLabel: {
      de: 'Lukas Federbusch bearbeitet Holz in seiner Werkstatt. Das Video läuft ohne Ton in einer Endlosschleife.',
      en: 'Lukas Federbusch working wood in his workshop. The video loops silently.',
    },
    objectFit: 'cover',
  },

  works: {
    // The works images in display order; `seo.ogImage` names one of them and validate-config keeps that honest.
    images: [
      {
        image: '/media/arbeiten/9ezd7rz08i9h1.jpg',
        imageAlt: {
          de: 'Handgefertigtes Möbelstück von Lukas Federbusch',
          en: 'Handcrafted piece of furniture by Lukas Federbusch',
        },
      },
      {
        image: '/media/arbeiten/signal-2026-07-20-20-14-59-447_003.jpg',
        imageAlt: {
          de: 'Handgefertigte Kommode von Lukas Federbusch',
          en: 'Handcrafted chest of drawers by Lukas Federbusch',
        },
      },
      {
        image: '/media/arbeiten/yz50v4rlf8be1.jpg',
        imageAlt: {
          de: 'Handgefertigtes Möbelstück von Lukas Federbusch',
          en: 'Handcrafted piece of furniture by Lukas Federbusch',
        },
      },
    ],
  },

  navigation: {
    items: [
      { type: 'anchor', anchor: 'arbeiten', label: { de: 'Arbeiten', en: 'Work' } },
      { type: 'tel' },
      { type: 'email' },
    ],
  },
}
