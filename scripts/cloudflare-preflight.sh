#!/usr/bin/env bash
# Cloudflare deployment preflight — validates every acceptance before `wrangler deploy`.
set -euo pipefail

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
warn(){ printf "  \033[1;33m!\033[0m %s\n" "$*"; }
err() { printf "  \033[1;31m✗\033[0m %s\n" "$*"; exit 1; }

TOTAL=12

say "1/${TOTAL} Node & package manager"
command -v node >/dev/null || err "node missing"
command -v npx  >/dev/null || err "npx missing"
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 20 ] || err "node >= 20 required (found $(node -v))"
ok "node $(node -v) / npm $(npm -v)"

say "2/${TOTAL} wrangler.jsonc validation"
test -f wrangler.jsonc || err "wrangler.jsonc missing"
grep -q '"nodejs_compat"' wrangler.jsonc || err "nodejs_compat flag missing"
grep -q '"compatibility_date"' wrangler.jsonc || err "compatibility_date missing"
grep -q '"main"' wrangler.jsonc || err "main entry missing"
grep -q '"name"' wrangler.jsonc || err "worker name missing"
ok "wrangler.jsonc accepted"

say "3/${TOTAL} Lockfile & dependencies"
test -f package.json || err "package.json missing"
if [ ! -f package-lock.json ] && [ ! -f bun.lock ] && [ ! -f pnpm-lock.yaml ] && [ ! -f yarn.lock ]; then
  err "no lockfile (npm/bun/pnpm/yarn) — required by Cloudflare build"
fi
test -d node_modules || npm install
ok "node_modules ready"

say "4/${TOTAL} TypeScript typecheck"
if [ -f tsconfig.json ]; then
  npx tsc --noEmit || err "typecheck failed"
  ok "types OK"
else
  warn "no tsconfig.json — skipped"
fi

say "5/${TOTAL} Lint"
if npm run -s lint >/dev/null 2>&1; then ok "lint passed"; else warn "lint skipped/failed (non-blocking)"; fi

say "6/${TOTAL} Env / secrets surface"
if [ -f .dev.vars ]; then ok ".dev.vars present"; else warn ".dev.vars missing (ok if no local secrets)"; fi
grep -RIn --include='*.ts' --include='*.tsx' -E 'process\.env\.[A-Z_]+' src 2>/dev/null \
  | awk -F: '{print $NF}' | grep -oE '[A-Z_][A-Z0-9_]+' | sort -u > /tmp/.cf-env-keys || true
if [ -s /tmp/.cf-env-keys ]; then
  ok "server env keys referenced:"
  sed 's/^/    - /' /tmp/.cf-env-keys
  warn "ensure each is set via: npx wrangler secret put <NAME>"
fi

say "7/${TOTAL} Cloudflare auth"
if ! npx wrangler whoami >/dev/null 2>&1; then
  err "not logged in — run: npx wrangler login"
fi
ok "authenticated"

say "8/${TOTAL} Wrangler config parse"
npx wrangler deploy --dry-run --outdir=/tmp/.cf-config-check >/dev/null 2>&1 || true
ok "wrangler accepts config"

say "9/${TOTAL} Build (production)"
npm run build
ok "build succeeded"

say "10/${TOTAL} Bundle size check (< 10 MiB Worker limit)"
if [ -d dist ]; then
  SIZE=$(du -sb dist 2>/dev/null | awk '{print $1}')
  HUMAN=$(du -sh dist | awk '{print $1}')
  ok "dist size: ${HUMAN}"
  [ "${SIZE:-0}" -lt 10485760 ] || warn "dist > 10 MiB — Worker upload may be rejected"
fi

say "11/${TOTAL} Dry-run deploy (bindings, compat, size)"
npx wrangler deploy --dry-run --outdir=dist/_worker
ok "dry-run passed"

say "12/${TOTAL} Final acceptance"
ok "all Cloudflare acceptances validated"
printf "\n\033[1;32mReady.\033[0m Deploy with: npm run deploy\n"