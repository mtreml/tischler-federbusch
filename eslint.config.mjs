import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  /* Formatting is Prettier's job and is its own gate. Turning the
     overlapping stylistic rules off here keeps the two from disagreeing. */
  prettier,

  {
    rules: {
      /* A raw string href bypasses the
         localized pathname map and 404s in exactly the locales that translate the
         segment — while the default locale keeps looking correct. Internal links go
         through the next-intl navigation helpers in `@/i18n/navigation`. */
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'next/link',
              message:
                'Use the locale-aware Link from "@/i18n/navigation". A raw next/link href bypasses the localized pathname map.',
            },
            {
              name: 'next/navigation',
              importNames: ['redirect', 'usePathname', 'useRouter'],
              message:
                'Use the locale-aware helpers from "@/i18n/navigation" so the emitted path is always the localized segment.',
            },
          ],
        },
      ],
    },
  },

  {
    /* The navigation module is where those helpers are created, so it is the one
       place that legitimately reaches for the underlying framework primitives. */
    files: ['src/i18n/navigation.ts'],
    rules: { 'no-restricted-imports': 'off' },
  },

  globalIgnores([
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
    'public/media/**',
    'coverage/**',
    'test-results/**',
    'playwright-report/**',
  ]),
])

export default eslintConfig
