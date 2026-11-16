#!/bin/sh
# ══════════════════════════════════════════════════════════════════════════════
# BOOTSTRAP — POSIX shell.
#
#     sh scripts/bootstrap.sh
#
# Takes a machine carrying only Git and a Node at or above the repo's floor to a
# passing gate chain, in a fixed order: prerequisites → the lockfile → the
# browsers → the gate chain. `set -eu` is the load-bearing clause: no step
# continues past an error.
#
# **CI runs this same script** (the workflow's gate-chain job has exactly one
# `run:` that does work, and it is this one), so the documented setup and the
# chain are verified together on every push.
#
# ── The git dependency, and the one rewrite the lockfile install needs ─────────
# This repo depends on the private `@mtreml/portfolio-core` package by git tag
# (package.json), and `npm ci` clones it. Without a credential that reaches that
# repository the clone is refused with an error that names the repository, not
# the missing credential. The job token on a runner is scoped to this repository
# alone — it cannot read the sibling repository — so the rewrite reads
# CORE_GIT_TOKEN, a repository secret holding a credential the account grants to
# both repositories, with GITHUB_TOKEN as the fallback for machines where it
# reaches both. When a credential is available this script rewrites github
# remotes, in every URL form npm might use, to a token-authenticated one via
# git's `insteadOf`, scoped to a stand-in global config that reaches every git
# process this chain spawns and changes nothing on the machine. A machine
# carrying neither fails the way it would for anyone: loudly, on the private
# clone, unless a pre-existing rewrite covers it.
# ══════════════════════════════════════════════════════════════════════════════

set -eu

REPO_ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
cd "$REPO_ROOT"

STARTED=$(date +%s)
STEP=0

section() {
  STEP=$((STEP + 1))
  printf '\n%s\n[%d] %s\n%s\n' \
    '──────────────────────────────────────────────────────────────────────────────' \
    "$STEP" "$1" \
    '──────────────────────────────────────────────────────────────────────────────'
}

fail() {
  printf '\n══════════════════════════════════════════════════════════════════════\n'
  printf 'BOOTSTRAP FAILED\n%s\n' "$1"
  printf '══════════════════════════════════════════════════════════════════════\n'
  exit 1
}

# Every external command goes through here, so `set -e` cannot be forgotten at a call site.
run_step() {
  description=$1
  shift
  printf '  %s\n' "$description"
  if ! "$@"; then
    fail "Step failed: $description
  command: $*"
  fi
}

# ── 1. Prerequisites ───────────────────────────────────────────────────────────
section 'Verifying prerequisites'

REQUIRED_NODE_LINE=$(tr -d ' \t\r\n' <.nvmrc)
ENGINE_SPEC=$(node -p "require('./package.json').engines.node" 2>/dev/null || echo '>=22')
REQUIRED_NODE_MAJOR=${ENGINE_SPEC#>=}
REQUIRED_NODE_MAJOR=${REQUIRED_NODE_MAJOR%%.*}

# ffmpeg and ffprobe are prerequisites rather than optional: the media pipeline
# re-encodes the landing video with them, and a machine that can run the
# gate chain but not the pipeline is not a machine this repo builds on.
for tool in node npm git ffmpeg ffprobe; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    case $tool in
      ffmpeg|ffprobe)
        fail "ffmpeg (and ffprobe) is not on PATH. The media pipeline's video encoder
  needs both, and the bootstrap deliberately does not install system packages.
  Install ffmpeg for your platform, then run this script again."
        ;;
      *)
        fail "$tool is not on PATH. The bootstrap deliberately does not install it.
  Install Node (the repo develops against $REQUIRED_NODE_LINE; anything satisfying
  engines $ENGINE_SPEC works) and Git, then run this script again."
        ;;
    esac
  fi
done

OBSERVED_NODE=$(node -v | sed 's/^v//')
OBSERVED_NODE_MAJOR=${OBSERVED_NODE%%.*}
if [ "$OBSERVED_NODE_MAJOR" -lt "$REQUIRED_NODE_MAJOR" ]; then
  fail "Node is too old for this repository.
  engines:  node $ENGINE_SPEC
  observed: $OBSERVED_NODE

  A newer major is fine; an older one changes what the toolchain may assume."
fi

printf '  node            observed %s   (engines: %s; developed against %s)\n' \
  "$OBSERVED_NODE" "$ENGINE_SPEC" "$REQUIRED_NODE_LINE"
printf '  npm             %s\n' "$(npm -v)"
printf '  git             %s\n' "$(git --version)"
printf '  ffmpeg          %s\n' "$(ffmpeg -version 2>/dev/null | head -n1)"
printf '  ffprobe         present\n'

# ── 2. The private git dependency, authenticated when a token is available ─────
section 'Configuring the git dependency'

# The job token's default scope is this repository alone — a runner cannot read
# the sibling portfolio-core repository with it. The CORE_GIT_TOKEN repository
# secret carries a credential the account grants to both repositories and is used
# when present; GITHUB_TOKEN stays the fallback for machines where it reaches
# both repositories.
TOKEN="${CORE_GIT_TOKEN:-${GITHUB_TOKEN:-}}"
if [ -n "${TOKEN}" ]; then
  # actions/checkout leaves a repo-local http.https://github.com/.extraheader
  # carrying its own Authorization header, which shadows token-embedded URL
  # credentials and 404s the clone. Nothing after the checkout still needs the
  # job-token header, so it comes off before the rewrite goes on.
  git config --local --unset-all http.https://github.com/.extraheader
  # The spec in package.json is an https URL, but npm normalizes a hosted github
  # dependency to its ssh form before cloning, whatever the spec and the lockfile
  # say. The rewrite must therefore cover every form the dependency can take, not
  # the one it was written with.
  #
  # The rewrite goes into a stand-in global config, exported as GIT_CONFIG_GLOBAL,
  # rather than only into this checkout's repo-local config: git reads a process's
  # repo-local config only when the process runs inside that repository, and npm
  # runs its dependency clone from a temporary directory outside the checkout.
  # The stand-in file reaches every git process this chain spawns, from any
  # working directory, and changes nothing on the machine; it holds the
  # credential, so it goes on exit.
  REWRITE_FILE="$(mktemp)"
  trap 'rm -f "${REWRITE_FILE}"' EXIT
  {
    printf '[url "https://x-access-token:%s@github.com/"]\n' "${TOKEN}"
    printf '\tinsteadOf = https://github.com/\n'
    printf '\tinsteadOf = ssh://git@github.com/\n'
    printf '\tinsteadOf = git@github.com:\n'
  } > "${REWRITE_FILE}"
  export GIT_CONFIG_GLOBAL="${REWRITE_FILE}"
  # Repo-local as well, so git operations inside the checkout stay authenticated
  # in a shell that does not carry the exported variable.
  git config url."https://x-access-token:${TOKEN}@github.com/".insteadOf 'https://github.com/'
  git config --add url."https://x-access-token:${TOKEN}@github.com/".insteadOf 'ssh://git@github.com/'
  git config --add url."https://x-access-token:${TOKEN}@github.com/".insteadOf 'git@github.com:'
  printf '  token present — github remotes in every URL form now clone token-authenticated (stand-in global and repo-local config).\n'
else
  printf '  no CORE_GIT_TOKEN and no GITHUB_TOKEN — a pre-existing insteadOf rewrite (or an SSH remote) must cover the\n'
  printf '  private @mtreml/portfolio-core git dependency, or `npm ci` will fail on the clone.\n'
fi

# ── 3. Dependencies, from the lockfile, in frozen mode ─────────────────────────
section 'Installing dependencies from the lockfile'
printf '  `npm ci` refuses to change the lockfile, so a machine that would have to\n'
printf '  resolve something else fails here instead of quietly building something\n'
printf '  different. It clones the pinned @mtreml/portfolio-core tag and runs its\n'
printf '  prepare, which builds the dist/ the gates of this site import.\n'
run_step 'npm ci' npm ci

# ── 4. End-to-end browsers ─────────────────────────────────────────────────────
section 'Installing the end-to-end runner browsers'
printf '  Playwright downloads browsers OUTSIDE the dependency tree, so dependency\n'
printf '  install alone leaves the e2e, a11y and cross gates unable to run.\n'
printf '  Two engine classes: chromium carries e2e and a11y; webkit carries cross.\n'
# `--with-deps` installs the OS libraries the browsers need and is the right default
# on a bare CI runner. It needs passwordless sudo, which a workstation may not have;
# there the libraries are usually already present, so a failed --with-deps falls back
# to the browser download alone. A genuinely missing library still cannot hide: the
# browser fails to launch and the e2e gate names it.
if ! npx --no-install playwright install --with-deps chromium webkit; then
  printf '  ! --with-deps needs passwordless sudo and could not run; installing the browsers alone.\n'
  run_step 'playwright install chromium webkit' npx --no-install playwright install chromium webkit
fi

# ── 5. The gate chain ──────────────────────────────────────────────────────────
section 'Running the gate chain'
printf '  The chain of this site, in order, stopping at the first failure:\n'
printf '  config:validate, then the generic gates (typecheck, lint, format, unit, build,\n'
printf '  e2e, a11y, cross, perf, media:meta), then links:check and meta:check.\n'
printf '  The list is scripts/ci.ts; the gate chain is the only thing that decides\n'
printf '  whether the push is good.\n'
run_step 'npm run ci' npm run --silent ci

# ── Report ──────────────────────────────────────────────────────────────────────
ELAPSED=$(($(date +%s) - STARTED))
printf '\n══════════════════════════════════════════════════════════════════════\n'
printf 'BOOTSTRAP COMPLETE in %dm %02ds\n' $((ELAPSED / 60)) $((ELAPSED % 60))
printf '══════════════════════════════════════════════════════════════════════\n'

cat <<'REPORT'

  What you have: every dependency from the lockfile (including the pinned
  @mtreml/portfolio-core tag), the browsers, and every gate green. The media
  library in media/ is generated, not committed — `npm run media:generate`
  rebuilds it from media-originals/ when those are present.

  Next:
    npm run dev            develop
    npm run ci             the full gate chain, exactly what CI runs
    npm run build          the production static export, into out/
    npm run serve          the export, host-accurate, on 127.0.0.1:4317
REPORT

exit 0
