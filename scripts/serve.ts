/* Serve the export host-accurately, with the port contract the site's gates rely on.

   The engine lives in `@mtreml/portfolio-core` (`portfolio-serve`), but its CLI takes both
   knobs as flags only. This site's gates spawn `npm run serve` with the two values in the
   environment — the contract the site's own static server had before the engine moved into
   the package: `PORT`, used by the perf gate and qa:sweep, and `SERVE_DIR`, used by exactly
   one caller, gate 7b, which serves a variant's export rather than the shipped `out/`. This
   wrapper is what keeps that contract: each variable, when set, becomes its flag, and with
   both unset the package's own defaults (4317, `out`) stand — 4317 being the port the
   Playwright webServer in playwright.config.ts waits on.

   Dropping `SERVE_DIR` would not be a harmless difference: the variant run would scan the
   shipped tree while reporting a variant's, which is the failure
   playwright.variant.config.ts names as the one to want to fail rather than to pass.

   A wrapper rather than a change to the package's CLI, because the dependency is the
   published tag, not this working tree — and a wrapper rather than `--port ${PORT}` in the
   npm script, because that expansion is a shell feature Windows' cmd does not have, and a
   gate that behaves differently by platform is a gate that cannot be reproduced where it
   has to be fixed.
*/
import { spawn } from 'node:child_process'
import { join } from 'node:path'

const bin = join(
  process.cwd(),
  'node_modules',
  '.bin',
  process.platform === 'win32' ? 'portfolio-serve.cmd' : 'portfolio-serve',
)

const args: string[] = []
const dir = process.env.SERVE_DIR
if (dir !== undefined) {
  args.push('--dir', dir)
}
const port = process.env.PORT
if (port !== undefined) {
  args.push('--port', port)
}
const child = spawn(bin, args, {
  stdio: 'inherit',
  shell: process.platform === 'win32',
})

child.on('error', (error) => {
  console.error(`serve: could not start portfolio-serve: ${error.message}`)
  process.exit(1)
})

/* The gates kill the tree they spawned; a signal to this wrapper must not outlive the
   server it is standing in front of. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    child.kill(signal)
  })
}

child.on('exit', (code, signal) => {
  process.exit(code ?? (signal === null ? 1 : 0))
})
