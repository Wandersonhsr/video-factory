#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://127.0.0.1:8080}"
: "${WORKER_TOKEN:?Set WORKER_TOKEN}"

echo "[1/4] health"
curl -fsS "$BASE_URL/health"
echo

echo "[2/4] create smoke job"
RESP="$(curl -fsS -X POST "$BASE_URL/jobs" \
  -H "Authorization: Bearer $WORKER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"mode":"smoke","title":"cli-smoke","duration_seconds":5,"width":1280,"height":720,"fps":30}')"
echo "$RESP"

JOB_ID="$(printf '%s' "$RESP" | python3 -c 'import json,sys; print(json.load(sys.stdin)["id"])')"

echo "[3/4] wait"
sleep 8

echo "[4/4] status"
STATUS="$(curl -fsS "$BASE_URL/jobs/$JOB_ID" -H "Authorization: Bearer $WORKER_TOKEN")"
echo "$STATUS"
printf '%s' "$STATUS" | python3 -c 'import json,sys; d=json.load(sys.stdin); assert d["status"]=="completed", d; print("SMOKE_OK", d["id"], d.get("output_size_bytes"))'
