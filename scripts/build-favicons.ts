/* ══════════════════════════════════════════════════════════════════════════════
   THE APPLE TOUCH ICON

   The favicon set is the minimal one (decided — open question 17): the SVG
   tab icon (`public/tab-icon.svg`, already wired in the `[locale]` layout)
   plus a single `apple-touch-icon.png`. The PNG exists because iOS
   home-screen icons ignore SVG, and 90 % of the visitors are phones — the
   one place the SVG cannot reach. No PNG 16/32/48 rungs: current browsers
   render the SVG, and a rung nobody draws is a file to keep in step.

   The mark sits on the site's own background — the warm white, read from
   `tokens.css` rather than re-declared here — because a home-screen icon is
   seen on a home screen, and a transparent one would pick up the wallpaper.

     npm run favicons:build    (re)generates public/apple-touch-icon.png

   The PNG is committed, like the font subset: it is a build artifact of an
   authored asset, small, and regenerating it is not part of the build chain.
   ══════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import sharp from 'sharp'

const ROOT = process.cwd()
const SIZE = 180

const tokens = readFileSync(join(ROOT, 'src', 'config', 'tokens.css'), 'utf8')
const match = tokens.match(/--color-background:\s*(#[0-9a-fA-F]{6})/)
if (match === null || match[1] === undefined) {
  throw new Error('tokens.css declares no --color-background — the icon has no ground to sit on.')
}
const backgroundHex = match[1]

const hex = backgroundHex.slice(1)
const background = {
  r: Number.parseInt(hex.slice(0, 2), 16),
  g: Number.parseInt(hex.slice(2, 4), 16),
  b: Number.parseInt(hex.slice(4, 6), 16),
}

async function main(): Promise<void> {
  await sharp(join(ROOT, 'public', 'tab-icon.svg'))
    .resize(SIZE, SIZE, { fit: 'contain', background })
    .png()
    .toFile(join(ROOT, 'public', 'apple-touch-icon.png'))

  process.stdout.write(`apple-touch-icon.png — ${SIZE}×${SIZE}, the mark on ${backgroundHex}\n`)
}

main().catch((error: unknown) => {
  process.stderr.write(`build-favicons — FAILED.\n  ${String(error)}\n`)
  process.exit(1)
})
