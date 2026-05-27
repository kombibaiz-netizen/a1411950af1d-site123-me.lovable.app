#!/usr/bin/env bash
# Cloudflare deployment preflight — validates every acceptance before `wrangler deploy`.
set -euo pipefail

say() { printf "\n\033[1;36m▶ %s\033[0m\n" "$*"; }
ok()  { printf "  \033[1;32m✓\033[0m %s\n" "$*"; }
err() { printf "  \033[1;31m✗\033[0m %s\n" "$*"; exit 1; }

say "1/7 Node & package manager"
command -v node >/dev/null || err "node missing"
command -v npx  >/dev/null || err "npx missing"
ok "node $(node -v)"

say "2/7 wrangler.jsonc present"
test -f wrangler.jsonc || err "wrangler.jsonc missing"
grep -q '"nodejs_compat"' wrangler.jsonc || err "nodejs_compat flag missing"
grep -q '"compatibility_date"' wrangler.jsonc || err "compatibility_date missing"
ok "config valid"

say "3/7 Dependencies installed"
test -d node_modules || npm install
ok "node_modules ready"

say "4/7 Cloudflare auth"
if ! npx wrangler whoami >/dev/null 2>&1; then
  err "not logged in — run: npx wrangler login"
fi
ok "authenticated"

say "5/7 Build"
npm run build
ok "build succeeded"

say "6/7 Dry-run deploy (validates bindings, size, compat)"
npx wrangler deploy --dry-run --outdir=dist/_worker
ok "dry-run passed"

say "7/7 Ready to deploy"
ok "run: npm run deploy"