import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Search v13 uses real production evidence but cannot index without trader and exact owner approval',()=>{
  const sql=readFileSync('docs/owner/sql/THEFEYA_SEARCH_V13_ACTUAL_GATE_EVIDENCE_20261026.sql','utf8');
  for(const evidence of [
    '87db114e84de4c59ca5d7d23d5ebb086ae56e742',
    'dpl_GhUCGrHKXZrojpXkTrRX22VrbfYo',
    '121896805927',
    'REVALIDATED_FOR_NEW_207_PRODUCT_SCOPE',
    'K07',
    'K20',
    'v.release_hash is null',
    'v13_gate_exact_207_product_portfolio_drift',
    'v13_gate_immutable_product_pin_mismatch',
    'feya_v13_gate_live_checkout_provider_not_ready',
    'feya_v13_gate_real_eur1_provider_test_missing',
    "'fail_count',2",
    "'pass_count',18",
    "'no_paid_customer_merchandise_purchase_claimed',true",
  ])assert.ok(sql.includes(evidence),evidence);
  assert.match(sql,/begin;[\s\S]*commit;\s*$/);
  assert.match(sql,/where g\.gate_code not in \('K07','K20'\)/);
  assert.match(sql,/g\.gate_code in \('K07','K20'\) and g\.gate_status='FAIL'/);
  assert.doesNotMatch(sql,/feya_search_prepare_release_activation_v1\s*\(/);
  assert.doesNotMatch(sql,/feya_search_execute_release_activation_v1\s*\(/);
  assert.doesNotMatch(sql,/set release_status='ACTIVE'/);
  assert.doesNotMatch(sql,/\b(?:insert into|delete from)\s+public\.feya_pay_orders_v1\b/i);
});

test('Privacy text never calls a live PayPal checkout inactive',()=>{
  const privacy=readFileSync('app/privacy/page.tsx','utf8');
  assert.match(privacy,/sellerOnlineEnabled\s*\?/);
  assert.match(privacy,/Online checkout is active/);
  assert.match(privacy,/Payments are processed/);
  assert.match(privacy,/Online checkout and payment processing are not active/);
});
