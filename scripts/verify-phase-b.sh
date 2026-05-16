#!/usr/bin/env bash
# Phase B verification — exercises every API route as PL, Intern, QR, executive.
# Asserts auth gating (401), role gating (403), and happy-path payloads.

set -uo pipefail
BASE="http://localhost:3000"
PASS="ethara.ai"
PASS_COUNT=0
FAIL_COUNT=0

assert_status() {
  local label="$1"; local got="$2"; local want="$3"
  if [ "$got" = "$want" ]; then
    echo "  ✓ $label → $got"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✗ $label — expected $want, got $got"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

assert_contains() {
  local label="$1"; local haystack="$2"; local needle="$3"
  if echo "$haystack" | grep -q "$needle"; then
    echo "  ✓ $label contains '$needle'"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo "  ✗ $label missing '$needle' — body: $(echo "$haystack" | head -c 200)"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

login() {
  local email="$1"; local jar="$2"
  local csrf
  csrf=$(curl -sS -c "$jar" -b "$jar" "$BASE/api/auth/csrf" | sed -n 's/.*"csrfToken":"\([^"]*\)".*/\1/p')
  curl -sS -c "$jar" -b "$jar" -o /dev/null \
    -d "csrfToken=$csrf" -d "email=$email" -d "password=$PASS" -d "callbackUrl=$BASE/" \
    "$BASE/api/auth/callback/credentials"
}

api() {
  local method="$1"; local url="$2"; local jar="$3"; local body="${4:-}"
  if [ -n "$body" ]; then
    curl -sS -b "$jar" -X "$method" -H "Content-Type: application/json" -d "$body" \
      -w "\n%{http_code}" "$BASE$url"
  else
    curl -sS -b "$jar" -X "$method" -w "\n%{http_code}" "$BASE$url"
  fi
}

# Logins
PL_JAR=$(mktemp -t "ea-pl-$$-XXXX")
INTERN_JAR=$(mktemp -t "ea-in-$$-XXXX")
QR_JAR=$(mktemp -t "ea-qr-$$-XXXX")
CEO_JAR=$(mktemp -t "ea-ceo-$$-XXXX")

login "pl@ethara.ai" "$PL_JAR"
login "intern@ethara.ai" "$INTERN_JAR"
login "qr@ethara.ai" "$QR_JAR"
login "ceo@ethara.ai" "$CEO_JAR"

NO_JAR=$(mktemp -t "ea-no-$$-XXXX")

echo "=========================================="
echo " Phase B verification — Ethara AI APIs"
echo "=========================================="

echo ""
echo "▶ 1. Auth gating (no session)"
RESP=$(api GET "/api/projects" "$NO_JAR")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "GET /api/projects (no auth)" "$CODE" "401"

echo ""
echo "▶ 2. /api/projects — list"
RESP=$(api GET "/api/projects" "$PL_JAR")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "GET /api/projects (PL)" "$CODE" "200"
assert_contains "PL list" "$BODY" "Project Alpha Integration"
assert_contains "PL list" "$BODY" "Q4 Marketing Rollout"

RESP=$(api GET "/api/projects" "$CEO_JAR")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "GET /api/projects (CEO)" "$CODE" "200"

echo ""
echo "▶ 3. /api/projects/[id] — detail + role boundary"
# Get a project id from PL listing
ALPHA_ID=$(echo "$BODY" | python3 -c "import sys, json; data = json.load(sys.stdin)['data']; print([p for p in data if p['name'] == 'Project Alpha Integration'][0]['id'])" 2>/dev/null)
if [ -z "$ALPHA_ID" ]; then
  # Re-fetch with PL_JAR
  RESP=$(api GET "/api/projects" "$PL_JAR")
  BODY=$(echo "$RESP" | sed '$d')
  ALPHA_ID=$(echo "$BODY" | python3 -c "import sys, json; data = json.load(sys.stdin)['data']; print([p for p in data if p['name'] == 'Project Alpha Integration'][0]['id'])")
fi
echo "  · alpha project id: $ALPHA_ID"

RESP=$(api GET "/api/projects/$ALPHA_ID" "$PL_JAR")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "GET /api/projects/[id] (PL, own project)" "$CODE" "200"
assert_contains "PL detail" "$BODY" "tasks"

# Intern is on Alpha (we seeded everyone there), so should be 200
RESP=$(api GET "/api/projects/$ALPHA_ID" "$INTERN_JAR")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "GET /api/projects/[id] (Intern member)" "$CODE" "200"

echo ""
echo "▶ 4. /api/projects/[id]/metrics"
RESP=$(api GET "/api/projects/$ALPHA_ID/metrics" "$PL_JAR")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "GET metrics (PL)" "$CODE" "200"
assert_contains "metrics body" "$BODY" "velocity"
assert_contains "metrics body" "$BODY" "forecast"
assert_contains "metrics body" "$BODY" "workload"

echo ""
echo "▶ 5. /api/tasks — list filtering"
RESP=$(api GET "/api/tasks?projectId=$ALPHA_ID" "$PL_JAR")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "GET /api/tasks?projectId= (PL)" "$CODE" "200"

INTERN_TASKS=$(api GET "/api/tasks" "$INTERN_JAR")
INTERN_BODY=$(echo "$INTERN_TASKS" | sed '$d')
INTERN_CODE=$(echo "$INTERN_TASKS" | tail -n 1)
assert_status "GET /api/tasks (Intern, no projectId)" "$INTERN_CODE" "200"
# Intern body should NOT mention tasks they don't own (e.g. "DB Migration Timeout")
if echo "$INTERN_BODY" | grep -q "DB Migration Timeout"; then
  echo "  ✗ Intern saw a task they shouldn't (DB Migration Timeout)"
  FAIL_COUNT=$((FAIL_COUNT + 1))
else
  echo "  ✓ Intern list correctly excludes non-assigned tasks"
  PASS_COUNT=$((PASS_COUNT + 1))
fi

echo ""
echo "▶ 6. /api/tasks — POST (create) role gating"
NEW_TASK_BODY="{\"title\":\"Verify Phase B\",\"projectId\":\"$ALPHA_ID\",\"priority\":\"MEDIUM\"}"

RESP=$(api POST "/api/tasks" "$INTERN_JAR" "$NEW_TASK_BODY")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "POST /api/tasks (Intern)" "$CODE" "403"

RESP=$(api POST "/api/tasks" "$PL_JAR" "$NEW_TASK_BODY")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "POST /api/tasks (PL)" "$CODE" "201"
NEW_TASK_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
echo "  · created task id: $NEW_TASK_ID"

echo ""
echo "▶ 7. /api/tasks/[id] — PATCH state machine + role rules"
# PL moves it to BLOCKED — blockedSince should be set
RESP=$(api PATCH "/api/tasks/$NEW_TASK_ID" "$PL_JAR" '{"status":"BLOCKED","blockerReason":"Awaiting infra"}')
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "PATCH set BLOCKED" "$CODE" "200"
assert_contains "blockedSince populated" "$BODY" "blockedSince\":\""

# PL moves it back to IN_PROGRESS — blockedSince should clear
RESP=$(api PATCH "/api/tasks/$NEW_TASK_ID" "$PL_JAR" '{"status":"IN_PROGRESS"}')
BODY=$(echo "$RESP" | sed '$d')
assert_contains "blockedSince cleared" "$BODY" "blockedSince\":null"

# Intern tries to edit a task they don't own → 403
RESP=$(api PATCH "/api/tasks/$NEW_TASK_ID" "$INTERN_JAR" '{"status":"DONE"}')
CODE=$(echo "$RESP" | tail -n 1)
assert_status "PATCH foreign task (Intern)" "$CODE" "403"

# Intern tries to change qrStatus → 403 (only QR/QL can)
# First make it the intern's task
api PATCH "/api/tasks/$NEW_TASK_ID" "$PL_JAR" "{\"assignedToId\":\"$(echo "$INTERN_TASKS" | sed '$d' | python3 -c "import sys, json; d = json.load(sys.stdin)['data']; print(d[0]['assignedTo']['id'])" 2>/dev/null)\"}" >/dev/null
RESP=$(api PATCH "/api/tasks/$NEW_TASK_ID" "$INTERN_JAR" '{"qrStatus":"APPROVED"}')
CODE=$(echo "$RESP" | tail -n 1)
assert_status "PATCH qrStatus (Intern, even own task)" "$CODE" "403"

# QR sets qrStatus → 200 and qrReviewedBy populates
RESP=$(api PATCH "/api/tasks/$NEW_TASK_ID" "$QR_JAR" '{"qrStatus":"APPROVED"}')
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "PATCH qrStatus (QR)" "$CODE" "200"
assert_contains "qr reviewer set" "$BODY" "qrReviewedBy"

# Cleanup
api DELETE "/api/tasks/$NEW_TASK_ID" "$PL_JAR" >/dev/null

echo ""
echo "▶ 8. /api/team — GET + PATCH"
RESP=$(api GET "/api/team?projectId=$ALPHA_ID" "$PL_JAR")
CODE=$(echo "$RESP" | tail -n 1); BODY=$(echo "$RESP" | sed '$d')
assert_status "GET /api/team (PL)" "$CODE" "200"
assert_contains "team members payload" "$BODY" "workloadPct"
assert_contains "team stats payload" "$BODY" "avgWorkload"

# PL toggles attendance
USER_TO_FLIP=$(echo "$BODY" | python3 -c "import sys, json; d = json.load(sys.stdin)['data']['members']; print(d[0]['userId'])" 2>/dev/null)
RESP=$(api PATCH "/api/team" "$PL_JAR" "{\"userId\":\"$USER_TO_FLIP\",\"projectId\":\"$ALPHA_ID\",\"isPresent\":false}")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "PATCH attendance (PL)" "$CODE" "200"
# Intern can't
RESP=$(api PATCH "/api/team" "$INTERN_JAR" "{\"userId\":\"$USER_TO_FLIP\",\"projectId\":\"$ALPHA_ID\",\"isPresent\":true}")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "PATCH attendance (Intern)" "$CODE" "403"
# Restore
api PATCH "/api/team" "$PL_JAR" "{\"userId\":\"$USER_TO_FLIP\",\"projectId\":\"$ALPHA_ID\",\"isPresent\":true}" >/dev/null

echo ""
echo "▶ 9. /api/eod/generate — role gating"
RESP=$(api POST "/api/eod/generate" "$INTERN_JAR" "{\"projectId\":\"$ALPHA_ID\",\"context\":\"test\"}")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "POST /api/eod/generate (Intern)" "$CODE" "403"

RESP=$(api POST "/api/eod/generate" "$QR_JAR" "{\"projectId\":\"$ALPHA_ID\",\"context\":\"test\"}")
CODE=$(echo "$RESP" | tail -n 1)
assert_status "POST /api/eod/generate (QR)" "$CODE" "403"

# As PL, without API key → expect 502 (Claude call failed), not 401/403
RESP=$(api POST "/api/eod/generate" "$PL_JAR" "{\"projectId\":\"$ALPHA_ID\",\"context\":\"test\",\"persist\":false}")
CODE=$(echo "$RESP" | tail -n 1)
if [ "$CODE" = "200" ] || [ "$CODE" = "502" ]; then
  echo "  ✓ POST /api/eod/generate (PL) → $CODE (acceptable: 200 with key, 502 without)"
  PASS_COUNT=$((PASS_COUNT + 1))
else
  echo "  ✗ POST /api/eod/generate (PL) — expected 200 or 502, got $CODE"
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# Cleanup jars
rm -f "$PL_JAR" "$INTERN_JAR" "$QR_JAR" "$CEO_JAR" "$NO_JAR"

echo ""
echo "=========================================="
echo " Result: $PASS_COUNT passed, $FAIL_COUNT failed"
echo "=========================================="
exit $FAIL_COUNT
