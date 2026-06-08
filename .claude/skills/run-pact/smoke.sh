#!/usr/bin/env bash
# Smoke test for the pact dev server.
# Usage: bash .claude/skills/run-pact/smoke.sh [port]
# Starts the dev server if not already running, verifies key routes, then exits.

set -euo pipefail
PORT="${1:-3000}"
BASE="http://localhost:${PORT}"
LOG="/tmp/pact-dev.log"
PID_FILE="/tmp/pact.pid"

server_running() {
  curl -sf "${BASE}" >/dev/null 2>&1
}

start_server() {
  echo "Starting dev server on port ${PORT}..."
  pkill -f "next dev" 2>/dev/null || true
  npm run dev > "${LOG}" 2>&1 &
  echo $! > "${PID_FILE}"
  echo "PID $(cat "${PID_FILE}") — logs at ${LOG}"

  echo -n "Waiting for server"
  for i in $(seq 1 60); do
    server_running && echo " ready (${i}s)" && return 0
    sleep 1
    echo -n "."
  done
  echo ""
  echo "ERROR: server did not become ready in 60s. Last log:"
  tail -20 "${LOG}"
  exit 1
}

# Start server only if not already up
server_running || start_server

echo ""
echo "=== Smoke tests ==="

check() {
  local label="$1"
  local url="$2"
  local expected_status="$3"
  local grep_text="${4:-}"

  actual=$(curl -s -o /tmp/smoke_body -w "%{http_code}" "${url}")
  if [ "${actual}" != "${expected_status}" ]; then
    echo "FAIL [${label}]: expected HTTP ${expected_status}, got ${actual} (${url})"
    exit 1
  fi
  if [ -n "${grep_text}" ]; then
    if ! grep -q "${grep_text}" /tmp/smoke_body; then
      echo "FAIL [${label}]: body did not contain '${grep_text}'"
      cat /tmp/smoke_body | head -5
      exit 1
    fi
  fi
  echo "PASS [${label}]: HTTP ${actual} ${url}"
}

check "home"       "${BASE}/"           200  "To get started"
check "dashboard"  "${BASE}/dashboard"  404
check "pacts"      "${BASE}/pacts"      404

echo ""
echo "All smoke tests passed."
