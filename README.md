# tischler-federbusch

Single-page site for **Lukas Federbusch - Tischlermeister** — `tischler-federbusch.at`.
One scroll page under `/de/` (landing → Arbeiten → footer) plus `/de/impressum-datenschutz/`.
German only; `de` is the one configured locale.

Built on Next 16 static export
(`output: 'export'`, `trailingSlash: true`), React 19, `next-intl` (locale prefix `/de/`),
`motion`, Tailwind 4, and the shared package `@mtreml/portfolio-core` pinned at
`git+https://github.com/mtreml/portfolio-core.git#v1.0.0` (the `deploy-vps` action is
consumed from the same tag). Everything the site shows comes from central configuration —
there is no content model.

## Getting started

```sh
sh scripts/bootstrap.sh   # prerequisites → npm ci → Playwright browsers → the gate chain
```

The bootstrap verifies Node (`.nvmrc` / `engines`), npm, git, **ffmpeg** (the media
pipeline's video encoder), then installs from the lockfile and runs the gate chain.
CI invokes the same script — the documented setup and the chain are verified together.

## Media

- `media-originals/` is a **local-only symlink** to the drop folder
  (`/home/atreo/code/tischler-federbusch/media-originals`) and is not in git. It is the
  sole copy of the client's originals — the thing a backup has to cover.
- `npm run media:generate` reads it via the core pipeline
  (`@mtreml/portfolio-core/pipeline`) and writes the derived variants into
  `media/<key>/media` — the landing master re-encoded to 1920 (audio and container
  metadata stripped, CRF measured in `src/config/media.config.ts`), its poster from the
  master's own opening frame, and the Works image on the width ladder. What the build
  declares is one list: `src/lib/media/declared.ts`.
- `npm run media:link` (already in `predev` and `prebuild`) links `public/media` at the
  key's library; `postbuild` runs `npm run export:media`, which counts `out/media`
  against the library and repairs the difference. **No media files in git, ever** —
  with one deliberate exception: the manifest *is* committed
  (`.media/manifest.json`, beside the key file `.media/key`), because a clean clone has
  no originals to read and the manifest is what keeps it building and exporting.
- `npm run media:meta:check` (in the gate chain) is the proof the strip held: no
  EXIF/XMP/IPTC on any rendition, no identifying container keys on the master, and no
  audio track in it. `npm run media:bucket:serve` serves the library as a bucket on
  127.0.0.1:4173.

## The gate chain

`npm run ci` (scripts/ci.ts) composes the chain:

```
config:validate → typecheck → lint → format → unit → build → e2e → a11y → cross
                → perf → media:meta → links:check → meta:check
```

The generic middle is taken from `@mtreml/portfolio-core/gates`; this site adds
`config:validate` ahead of everything and `links:check` / `meta:check` after the build,
because both read the export rather than the source. Gates for work packages not yet
landed are added to the chain as those packages land; the order is fixed.

Day to day:

```sh
npm run dev         # develop (links the media library first)
npm run build       # production static export into out/ (strict config validation first)
npm run serve       # serve out/ host-accurately on 127.0.0.1:4317
```

## Deployment

Deployment is WP-09: the `deploy-vps` composite action from the core repository uploads the
**gated** `out/` (built by the gate chain, never rebuilt) to the VPS release tree under
`/srv/tischler-federbusch`. The box is provisioned as a fresh multi-site machine (one Caddy,
every site additive); until the DNS for `tischler-federbusch.at` / `www.` points at it, the
site runs gate-closed (loopback + `noindex`).
