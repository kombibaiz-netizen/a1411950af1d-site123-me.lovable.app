#!/usr/bin/env bash
# Capture commit metadata at each Vercel deployment.
# Runs automatically as part of Vercel's buildCommand.
set -euo pipefail

SHA="${VERCEL_GIT_COMMIT_SHA:-$(git rev-parse HEAD 2>/dev/null || echo unknown)}"
REF="${VERCEL_GIT_COMMIT_REF:-$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)}"
MSG="${VERCEL_GIT_COMMIT_MESSAGE:-$(git log -1 --pretty=%s 2>/dev/null || echo '')}"
AUTHOR="${VERCEL_GIT_COMMIT_AUTHOR_LOGIN:-$(git log -1 --pretty=%an 2>/dev/null || echo '')}"
BUILT_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
ENV="${VERCEL_ENV:-local}"

mkdir -p public
cat > public/deploy-info.json <<EOF
{
  "commit": "${SHA}",
  "ref": "${REF}",
  "message": $(printf '%s' "${MSG}" | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>process.stdout.write(JSON.stringify(s)))"),
  "author": "${AUTHOR}",
  "environment": "${ENV}",
  "builtAt": "${BUILT_AT}"
}
EOF

echo "[vercel-deploy-commit] ${ENV} @ ${SHA} (${REF}) — ${BUILT_AT}"