#!/usr/bin/env bash
# PostgREST + supabase-js で、アプリが実際に発行するクエリを RLS 下で検証する(使い捨てコンテナ。本番には接続しない)。
# 使い方: bash db/phase2_test/e2e/run.sh  (Docker と、リポジトリで npm ci 済みの node_modules が必要)
set -euo pipefail
cd "$(dirname "$0")/.."
PG=connexy-phase2-e2e-pg
REST=connexy-phase2-e2e-rest
NET=connexy-phase2-e2e-net
cleanup() { docker rm -f "$PG" "$REST" >/dev/null 2>&1 || true; docker network rm "$NET" >/dev/null 2>&1 || true; }
cleanup
trap cleanup EXIT
docker network create "$NET" >/dev/null
docker run -d --name "$PG" --network "$NET" -e POSTGRES_PASSWORD=test postgres:16-alpine >/dev/null
for i in $(seq 1 60); do docker exec "$PG" pg_isready -U postgres >/dev/null 2>&1 && break; sleep 1; done
sleep 2
run() { MSYS_NO_PATHCONV=1 docker exec -i "$PG" psql -U postgres -v ON_ERROR_STOP=1 -q -f - < "$1"; }
run 00_baseline.sql
run 01_seed.sql
run ../phase2_auth_rls.sql 2>/dev/null
run 02_accounts.sql
docker run -d --name "$REST" --network "$NET" -p 3999:3000 \
  -e PGRST_DB_URI="postgres://postgres:test@$PG:5432/postgres" \
  -e PGRST_DB_SCHEMAS=public -e PGRST_DB_ANON_ROLE=anon \
  -e PGRST_JWT_SECRET="test-secret-test-secret-test-secret-123456" \
  postgrest/postgrest:v12.2.3 >/dev/null
for i in $(seq 1 30); do curl -s -o /dev/null http://localhost:3999/ && break; sleep 1; done
cd e2e
node e2e.mjs
