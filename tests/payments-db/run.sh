#!/usr/bin/env bash
# Runs the payments migration tests on a disposable database.
# Usage: PGHOST=... PGPORT=... PGUSER=... [PGPASSWORD=...] tests/payments-db/run.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
DB="${FEYA_PAYMENTS_TEST_DB:-feya_payments_test}"
psql -q -d postgres -c "drop database if exists $DB" >/dev/null
psql -q -d postgres -c "create database $DB" >/dev/null
run(){ psql -q -X -v ON_ERROR_STOP=1 -d "$DB" "$@"; }
run -f tests/payments-db/supabase_stub.sql
# 1) Fresh install
run -f supabase/migrations/20261021200000_payments_provider_checkout_v1.sql
out=$(run -t -f tests/payments-db/payments_v1.test.sql 2>&1)
echo "$out" | grep -E "ok - |FAILED|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "$out" | grep -q "payments_v1: all assertions passed" || { echo "::error::payments_v1 SQL tests failed"; exit 1; }
# 2) Upgrade path from the earlier Seller Online setup panel (data carry-over)
psql -q -d postgres -c "drop database $DB" >/dev/null
psql -q -d postgres -c "create database $DB" >/dev/null
run -f tests/payments-db/supabase_stub.sql
for m in 20261021154000_seller_online_self_serve_payment_setup_v1 20261021165000_seller_online_paypal_connection_probe_v1 20261021174000_seller_online_paypal_ipn_inbox_v1; do
  run -f "supabase/migrations/$m.sql"
done
run -f tests/payments-db/legacy_seed.sql
run -f supabase/migrations/20261021200000_payments_provider_checkout_v1.sql
out=$(run -t -f tests/payments-db/payments_upgrade.test.sql 2>&1)
echo "$out" | grep -E "ok - |FAILED|ERROR" | sed 's/^psql:[^ ]* NOTICE:  //'
echo "$out" | grep -q "payments_upgrade: all assertions passed" || { echo "::error::payments upgrade SQL tests failed"; exit 1; }
psql -q -d postgres -c "drop database $DB" >/dev/null
echo "payments DB tests: PASS"
