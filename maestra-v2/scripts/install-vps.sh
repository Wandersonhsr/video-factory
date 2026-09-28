#!/usr/bin/env sh
set -eu

: "${WORKER_TOKEN:?Set WORKER_TOKEN before running}"

command -v docker >/dev/null 2>&1 || { echo "Docker is required"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "Docker Compose plugin is required"; exit 1; }

docker compose up -d --build
echo "Waiting for health..."
i=0
until curl -fsS http://127.0.0.1:8080/health >/dev/null 2>&1; do
  i=$((i+1))
  [ "$i" -lt 30 ] || { docker compose logs --tail=200; exit 1; }
  sleep 2
done

echo "MAESTRA_V2_HEALTHY"
BASE_URL=http://127.0.0.1:8080 WORKER_TOKEN="$WORKER_TOKEN" sh ./scripts/smoke-test.sh
