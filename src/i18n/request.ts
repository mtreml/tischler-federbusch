import { hasLocale } from 'next-intl'
import { getRequestConfig } from 'next-intl/server'

import { routing } from './routing'

/* ══════════════════════════════════════════════════════════════════════════════
   PER-REQUEST i18n CONFIGURATION.

   Under a static export this runs at build time, once per generated document. The
   `[locale]` segment effectively acts as a catch-all, so an unknown value has to be
   replaced with a valid locale rather than trusted — that is what `hasLocale` is for, and
   the page itself additionally calls `notFound()` so an unknown locale reaches the
   not-found document instead of rendering an empty shell.
   ══════════════════════════════════════════════════════════════════════════════ */

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    /* One message file per locale. A key present in one locale and missing from another
       fails the message-parity test — everything user-visible is translatable, and a
       string that reaches the screen and is not in the translation set is a defect. */
    messages: (await import(`./messages/${locale}.json`)).default,
    /* Lienz, matching the jurisdiction the legal page is written for. Fixed rather than
       read from the visitor, since a static export renders once at build time. */
    timeZone: 'Europe/Vienna',
  }
})
