import { getTranslations } from 'next-intl/server'

import { site } from '@/config/site.config'
import { Link } from '@/i18n/navigation'
import { resolveCopyrightHolder } from '@/lib/config/resolve'

/* ══════════════════════════════════════════════════════════════════════════════
   THE FOOTER — the last element of the one-scroll landing document

   One line on `md` and up, stacked on the phone: the copyright, the legal
   entry and the credit. Every value resolves from the central configuration
   at render — the holder through `resolveCopyrightHolder()` (so there is no
   second name), the credit name and target from `footer.*`, the one
   structural label ("Made with care & love by") from the locale messages. Pure server
   component, no state; the static export prerenders it, and the no-JS
   visitor gets the same line.

   The legal entry is a **plain link with plain navigation** (decided, open
   question 3): a next-intl `Link` to the legal route **without**
   `data-transition` — the sequence owner's capture interception only touches
   `data-transition` elements, so no overlay fires. It is the only navigation
   on this site to the legal page besides the browser.
   ══════════════════════════════════════════════════════════════════════════════ */

export async function Footer() {
  const t = await getTranslations('footer')

  /* The holder resolves to `contact.name` — the year is rendered, not
     configured: it is a fact about when the document is built. */
  const holder = resolveCopyrightHolder()
  const year = new Date().getFullYear()

  return (
    <footer className="site-footer">
      <div className="site-footer__row">
        <p className="site-footer__copyright">
          © {year} {holder}
        </p>
        {/* Plain navigation: no `data-transition`, so the sequence never sees it. */}
        <Link className="site-footer__legal" href="/impressum-datenschutz">
          {site.footer.legalLabel}
        </Link>
        <p className="site-footer__credit">
          {t('creditPrefix')}{' '}
          {/* External, decided: a new tab, with the `rel` the renderer owes it. */}
          <a href={site.footer.creditUrl} target="_blank" rel="noreferrer">
            {site.footer.credit}
          </a>
        </p>
      </div>
    </footer>
  )
}
