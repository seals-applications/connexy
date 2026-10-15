#!/usr/bin/env bash
# Phase 2 の RLS テストをローカルの使い捨て Postgres(docker)で実行する。
# 使い方: bash db/phase2_test/run.sh   (Docker が必要。本番には一切接続しない)
set -euo pipefail
cd "$(dirname "$0")"
NAME=connexy-phase2-test
docker rm -f "$NAME" >/dev/null 2>&1 || true
docker run -d --name "$NAME" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
trap 'docker rm -f "$NAME" >/dev/null 2>&1 || true' EXIT
for i in $(seq 1 60); do
  docker exec "$NAME" pg_isready -U postgres >/dev/null 2>&1 && break
  sleep 1
done
sleep 2
run() { MSYS_NO_PATHCONV=1 docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$1"; }
run 00_baseline.sql
run 01_seed.sql
echo "--- apply migration (1st)"; run ../phase2_auth_rls.sql
echo "--- apply migration (2nd, idempotency)"; run ../phase2_auth_rls.sql
run 02_accounts.sql
out=$(MSYS_NO_PATHCONV=1 docker exec -i "$NAME" psql -U postgres -v ON_ERROR_STOP=1 -q -f - < 03_tests.sql)
echo "$out"
echo "$out" | grep -qE '^ +0 \| +[0-9]+' || { echo "TESTS FAILED"; exit 1; }
echo "ALL PASSED"
