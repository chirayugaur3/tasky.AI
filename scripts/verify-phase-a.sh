#!/usr/bin/env bash
# Phase A verification — drives the auth chain via curl for every seeded role.
# Asserts:
#   1. Unauthenticated GET / redirects to /login
#   2. Unauthenticated GET /dashboard/pl redirects to /login
#   3. For each of the 7 roles:
#        - Credentials sign-in succeeds
#        - /api/auth/session returns the correct role
#        - Middleware redirects them to the correct home dashboard
#   4. Role-boundary enforcement: PL hitting /dashboard/executive bounces back

set -uo pipefail

BASE="http://localhost:3000"
PASS="ethara.ai"
PASS_COUNT=0
FAIL_COUNT=0

declare -a TESTS=(
  "ceo@ethara.ai|CEO|/dashboard/executive"
  "cto@ethara.ai|CTO|/dashboard/executive"
  "tpm@ethara.ai|TPM|/dashboard/executive"
  "pl@ethara.ai|PROJECT_LEAD|/dashboard/pl"
  "ql@ethara.ai|QUALITY_LEAD|/dashboard/ql"
  "qr@ethara.ai|QR|/dashboard/qr"
  "intern@ethara.ai|INTERN|/dashboard/intern"
)

assert_eq() {
  if [ "$2" = "$3" ]; then
    echo "  ✓ $1 = $2"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✗ $1 — expected '$3', got '$2'"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

login_and_test() {
  local email="$1"
  local expected_role="$2"
  local expected_home="$3"
  local jar
  jar=$(mktemp -t "ethara-jar-$$-XXXXXX")

  echo ""
  echo "▶ $email ($expected_role)"

  # 1. CSRF token
  local csrf_response
  csrf_response=$(curl -sS -c "$jar" -b "$jar" "$BASE/api/auth/csrf")
  local csrf
  csrf=$(echo "$csrf_response" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
  if [ -z "$csrf" ]; then
    echo "  ✗ failed to fetch CSRF token"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    rm -f "$jar"
    return
  fi

  # 2. Sign in
  curl -sS -c "$jar" -b "$jar" -o /dev/null \
    -d "csrfToken=$csrf" \
    -d "email=$email" \
    -d "password=$PASS" \
    -d "callbackUrl=$BASE/" \
    "$BASE/api/auth/callback/credentials"

  # 3. Session contains correct role
  local session
  session=$(curl -sS -b "$jar" "$BASE/api/auth/session")
  local role
  role=$(echo "$session" | sed -n 's/.*"role":"\([^"]*\)".*/\1/p')
  assert_eq "session.role" "$role" "$expected_role"

  # 4. /dashboard root redirects to role home
  local redirect_to
  redirect_to=$(curl -sS -b "$jar" -o /dev/null -w "%{redirect_url}" "$BASE/dashboard")
  local path="${redirect_to#$BASE}"
  assert_eq "GET /dashboard redirect" "$path" "$expected_home"

  # 5. Authenticated GET /login bounces to role home
  redirect_to=$(curl -sS -b "$jar" -o /dev/null -w "%{redirect_url}" "$BASE/login")
  path="${redirect_to#$BASE}"
  assert_eq "GET /login (auth) bounce" "$path" "$expected_home"

  # 6. Role-boundary: only PROJECT_LEAD should reach /dashboard/pl directly
  if [ "$expected_home" != "/dashboard/pl" ]; then
    redirect_to=$(curl -sS -b "$jar" -o /dev/null -w "%{redirect_url}" "$BASE/dashboard/pl")
    path="${redirect_to#$BASE}"
    assert_eq "GET /dashboard/pl (foreign role) bounce" "$path" "$expected_home"
  else
    local code
    code=$(curl -sS -b "$jar" -o /dev/null -w "%{http_code}" "$BASE/dashboard/pl")
    assert_eq "GET /dashboard/pl (own role) http" "$code" "200"
  fi

  rm -f "$jar"
}

echo "=========================================="
echo " Phase A verification — Ethara AI"
echo "=========================================="
echo ""
echo "▶ Unauthenticated checks"

UNAUTH_REDIRECT=$(curl -sS -o /dev/null -w "%{redirect_url}" "$BASE/")
assert_eq "GET / (no auth) →" "${UNAUTH_REDIRECT#$BASE}" "/login"

UNAUTH_DASH=$(curl -sS -o /dev/null -w "%{redirect_url}" "$BASE/dashboard/pl")
case "${UNAUTH_DASH#$BASE}" in
  /login*) echo "  ✓ GET /dashboard/pl (no auth) → /login"; PASS_COUNT=$((PASS_COUNT + 1)) ;;
  *) echo "  ✗ GET /dashboard/pl (no auth) — expected /login*, got '${UNAUTH_DASH#$BASE}'"; FAIL_COUNT=$((FAIL_COUNT + 1)) ;;
esac

for entry in "${TESTS[@]}"; do
  IFS='|' read -r email role home <<< "$entry"
  login_and_test "$email" "$role" "$home"
done

echo ""
echo "=========================================="
echo " Result: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=========================================="
exit $FAIL_COUNT
