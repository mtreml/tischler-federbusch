/* ══════════════════════════════════════════════════════════════════════════════
   CONFIGURATION VALIDATION — WP-01 MINIMAL

     npm run config:validate          development severity
     npm run config:validate:strict   production severity (re-run by `prebuild`)

   WP-02 introduces the central configuration (the zod-validated `site` config:
   identity, contact, routes, seo, media declarations) and this script becomes its
   validator. Until then the only configured surface is the locale set, and this is
   what it checks — so the gate is real from day one and grows with WP-02.
   ══════════════════════════════════════════════════════════════════════════════ */
import { defaultLocale, locales } from '../src/i18n/routing'

const production = process.argv.includes('--production')

const errors: string[] = []

if (locales.length === 0) {
  errors.push('the configured locale set is empty — the export would contain no documents')
}

if (locales.length > 0 && !locales.includes(defaultLocale)) {
  errors.push(
    `default locale "${defaultLocale}" is not in the configured set (${locales.join(', ')})`,
  )
}

if (new Set(locales).size !== locales.length) {
  errors.push(`the configured locale set has duplicates: ${locales.join(', ')}`)
}

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`  ✗ ${error}`)
  }
  console.error(`\nconfig:validate${production ? ' (strict)' : ''}: ${errors.length} error(s)`)
  process.exit(1)
}

console.log(
  `config:validate${production ? ' (strict)' : ''}: OK — ` +
    `${locales.length} locale(s) (${locales.join(', ')}), default "${defaultLocale}"`,
)
