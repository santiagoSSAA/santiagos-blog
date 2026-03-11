#!/bin/sh
set -e
BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
MAX_ATTEMPTS="${SMOKE_ATTEMPTS:-30}"
SLEEP_SEC="${SMOKE_SLEEP:-2}"

echo "Smoke: waiting for $BASE_URL ..."
attempt=0
while [ "$attempt" -lt "$MAX_ATTEMPTS" ]; do
  if curl -sf -o /dev/null "$BASE_URL/"; then
    echo "Smoke: app responded"
    break
  fi
  attempt=$((attempt + 1))
  sleep "$SLEEP_SEC"
done
if [ "$attempt" -eq "$MAX_ATTEMPTS" ]; then
  echo "Smoke: timeout waiting for app"
  exit 1
fi

check() {
  url="$1"
  code="$2"
  echo "Smoke: GET $url (expect $code)"
  actual=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  if [ "$actual" != "$code" ]; then
    echo "Smoke: FAIL $url got $actual expected $code"
    exit 1
  fi
}

check "$BASE_URL/" 200
check "$BASE_URL/blog" 200
check "$BASE_URL/about" 200
check "$BASE_URL/admin/login" 200

echo "Smoke: newsletter POST (expect 400 sin body)"
code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/newsletter" \
  -H "Content-Type: application/json" -d '{}')
if [ "$code" != "400" ]; then
  echo "Smoke: FAIL newsletter empty body got $code expected 400"
  exit 1
fi

echo "Smoke: all checks passed"
