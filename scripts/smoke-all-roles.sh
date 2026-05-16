#!/usr/bin/env bash
# Smoke test: log in as each role, hit their home dashboard, expect 200.
set -uo pipefail
BASE="http://localhost:3000"
PASS="ethara.ai"

login_and_check() {
  local email="$1"; local path="$2"
  local jar; jar=$(mktemp)
  local csrf
  csrf=$(curl -sS -c "$jar" -b "$jar" "$BASE/api/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
  curl -sS -c "$jar" -b "$jar" -o /dev/null \
    -d "csrfToken=$csrf" -d "email=$email" -d "password=$PASS" -d "callbackUrl=$BASE/" \
    "$BASE/api/auth/callback/credentials"
  local code
  code=$(curl -sS -b "$jar" -o /dev/null -w "%{http_code}" "$BASE$path")
  if [ "$code" = "200" ]; then
    echo "✓ $email → $path"
  else
    echo "✗ $email → $path (got $code)"
  fi
  rm -f "$jar"
}

echo "Smoke test — every role's home dashboard"
echo "----------------------------------------"
login_and_check "pl@ethara.ai" "/dashboard/pl"
login_and_check "pl@ethara.ai" "/dashboard/pl/projects"
login_and_check "pl@ethara.ai" "/dashboard/pl/team"
login_and_check "pl@ethara.ai" "/dashboard/pl/eod"
login_and_check "ceo@ethara.ai" "/dashboard/executive"
login_and_check "cto@ethara.ai" "/dashboard/executive"
login_and_check "tpm@ethara.ai" "/dashboard/executive"
login_and_check "ql@ethara.ai" "/dashboard/ql"
login_and_check "qr@ethara.ai" "/dashboard/qr"
login_and_check "intern@ethara.ai" "/dashboard/intern"
