/* ══════════════════════════════════════════════════════════════════════════════
   THE TISCHLER-FEDERBUSCH GATE LIST.

     npm run ci                 tsx scripts/ci.ts

   This site's list is the GENERIC gates — typecheck, lint, format, unit, build, e2e, a11y,
   cross, perf, media:meta — taken from `@mtreml/portfolio-core/gates` and run in their
   shared order, plus the design gates that stay local to this site, in the places their
   dependencies fix:

     config:validate   ahead of everything — `prebuild` re-runs it strictly, and failing it
                       early rather than inside the build names the cause.
     links:check       after the build — it reads the export, not the source.
     meta:check        after the build, beside the link check: everything it asserts (the
                       titles, the canonical URL, the sitemap, the crawler policy) is a
                       property of the EMITTED document.

   There are no mode-variant gates: this site has no modes. The gates for parts not yet
   landed (the media pipeline's, the real link/meta/perf implementations) take their
   place in this list as those parts land; the order here is the fixed one.

   `npm run ci` is the only thing that decides whether a push is good.
   ══════════════════════════════════════════════════════════════════════════════ */
import { genericGates, runGates, type Gate } from '@mtreml/portfolio-core/gates'

/* On Windows the npm entry point is `npm.cmd`, and since Node 20 `spawnSync` refuses to launch a
   `.cmd` without a shell. The package's runner enables the shell on Windows for that reason, and
   every argument here is a single bare token, so nothing needs quoting. */
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'

/* The generic chain, in order, from the package: check the source, then the tests,
   then the build, then the artifact the browser-facing gates read. Each one is an
   `npm run <script>` against THIS repo's package.json, which decides what it does. */
const generic = genericGates()

const configValidate: Gate = {
  id: 'config:validate',
  name: 'Configuration validation',
  command: npm,
  args: ['run', '--silent', 'config:validate:strict'],
}

const linksCheck: Gate = {
  id: 'links:check',
  name: 'Link check',
  command: npm,
  args: ['run', '--silent', 'links:check'],
  note: 'reads the export, not the source — that is why it runs after the build',
}

const metaCheck: Gate = {
  id: 'meta:check',
  name: 'Metadata check',
  command: npm,
  args: ['run', '--silent', 'meta:check'],
  note:
    'titles, canonical URLs, the sitemap and the crawler policy are all properties of the ' +
    'emitted document — that is why this runs after the build',
}

/* This site's chain: the configuration gate, the generic ten in their shared order, then
   the artifact-reading gates. */
const gates: Gate[] = [configValidate, ...generic, linksCheck, metaCheck]

const report = runGates(gates)
process.exit(report.passed ? 0 : 1)
