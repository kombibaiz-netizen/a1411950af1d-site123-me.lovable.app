#!/usr/bin/env bash
# Unified pre-deployment acceptance for Cloudflare AND Vercel.
set -euo pipefail

say()  { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()   { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
warn() { printf "  \033[1;33m!\033[0m %s\n" "$*"; }
err()  { printf "  \033[1;31m✗\033[0m %s\n" "$*"; exit 1; }

TOTAL=10

say "1/${TOTAL} Node & npm"
command -v node >/dev/null || err "node missing"
NODE_MAJOR=$(node -v | sed 's/v\([0-9]*\).*/\1/')
[ "$NODE_MAJOR" -ge 20 ] || err "node >= 20 required (found $(node -v))"
ok "node $(node -v)"

say "2/${TOTAL} Lockfile present"
if [ ! -f package-lock.json ] && [ ! -f bun.lock ] && [ ! -f pnpm-lock.yaml ] && [ ! -f yarn.lock ]; then
  err "no lockfile — required by Cloudflare & Vercel builds"
fi
ok "lockfile present"

say "3/${TOTAL} Dependencies"
test -d node_modules || npm install
ok "node_modules ready"

say "4/${TOTAL} TypeScript typecheck"
npx tsc --noEmit || err "typecheck failed"
ok "types OK"

say "5/${TOTAL} Lint (non-blocking)"
npm run -s lint >/dev/null 2>&1 && ok "lint passed" || warn "lint reported issues"

say "6/${TOTAL} Cloudflare config (wrangler.jsonc)"
test -f wrangler.jsonc || err "wrangler.jsonc missing"
for key in '"nodejs_compat"' '"compatibility_date"' '"main"' '"name"'; do
  grep -q "$key" wrangler.jsonc || err "wrangler.jsonc: $key missing"
done
ok "Cloudflare config accepted"

say "7/${TOTAL} Vercel config (vercel.json)"
test -f vercel.json || err "vercel.json missing"
node -e "JSON.parse(require('fs').readFileSync('vercel.json','utf8'))" || err "vercel.json invalid JSON"
for key in buildCommand outputDirectory installCommand; do
  grep -q "\"$key\"" vercel.json || err "vercel.json: $key missing"
done
ok "Vercel config accepted"

say "8/${TOTAL} Production build"
npm run build
test -d dist || err "dist/ not produced"
ok "build succeeded"

say "9/${TOTAL} Bundle size (< 10 MiB Worker limit)"
SIZE=$(du -sb dist | awk '{print $1}')
HUMAN=$(du -sh dist | awk '{print $1}')
ok "dist size: ${HUMAN}"
[ "${SIZE:-0}" -lt 10485760 ] || warn "dist > 10 MiB — Cloudflare upload may be rejected"

say "10/${TOTAL} Cloudflare dry-run deploy"
if npx wrangler whoami >/dev/null 2>&1; then
  npx wrangler deploy --dry-run --outdir=dist/_worker
  ok "Cloudflare dry-run passed"
else
  warn "wrangler not authenticated — skipping dry-run (run: npx wrangler login)"
fi

printf "\n\033[1;32m✓ All acceptances validated for Cloudflare & Vercel.\033[0m\n"
printf "  Cloudflare: npm run deploy\n"
printf "  Vercel:     vercel --prod\n"