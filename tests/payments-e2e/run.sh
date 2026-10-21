#!/usr/bin/env bash
# End-to-end payments flow against a disposable PostgreSQL database.
# Usage: PGHOST=... PGPORT=... PGUSER=... [PGPASSWORD=...] tests/payments-e2e/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
export FEYA_PAYMENTS_TEST_DB="${FEYA_PAYMENTS_TEST_DB:-feya_payments_e2e}"
psql -q -X -d postgres -c "drop database if exists $FEYA_PAYMENTS_TEST_DB" >/dev/null
psql -q -X -d postgres -c "create database $FEYA_PAYMENTS_TEST_DB" >/dev/null
psql -q -X -v ON_ERROR_STOP=1 -d "$FEYA_PAYMENTS_TEST_DB" -f tests/payments-db/supabase_stub.sql
psql -q -X -v ON_ERROR_STOP=1 -d "$FEYA_PAYMENTS_TEST_DB" -f supabase/migrations/20261021200000_payments_provider_checkout_v1.sql
node --experimental-strip-types --no-warnings --import ./tests/payments-e2e/register.mjs --test --test-concurrency=1 tests/payments-e2e/flow.test.mjs
