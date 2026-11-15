import { getPathname } from './navigation'

/* ══════════════════════════════════════════════════════════════════════════════
   PATHS WITH THE TRAILING SLASH THE EXPORT ACTUALLY WRITES.

   `trailingSlash: true` makes the export write `/<path>/index.html`, and `next/link` appends the
   slash when it renders an href. **`getPathname()` does not** — it returns `/de`, not `/de/`,
   because next-intl resolves the localized pathname without knowing the framework's
   trailing-slash setting.

   That only bites where a path is used *outside* a `Link`: the root-redirect document, the
   not-found page and the link gate all build hrefs directly. On a plain static host `/de` and
   `/de/` are different requests — the first has no file behind it — so the difference is a 404,
   not a cosmetic inconsistency.

   One helper, used at every such call site, so the rule is applied once rather than remembered
   four times.
   ══════════════════════════════════════════════════════════════════════════════ */

type PathnameArgument = Parameters<typeof getPathname>[0]

export function pathFor(argument: PathnameArgument): string {
  const path = getPathname(argument)
  return path.endsWith('/') ? path : `${path}/`
}
