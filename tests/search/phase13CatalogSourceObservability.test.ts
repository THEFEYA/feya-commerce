import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase13 approved-card SQL tail diagnostics never change product truth or release authority',()=>{
  const src=readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  assert.ok(src.includes("STOREFRONT_CARD_READ_MODEL_V1 = 'feya_storefront_product_cards_fast_v3'"));
  assert.ok(src.includes('STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT = 207'));
  assert.ok(src.includes("'feya_catalog_source_read_v1'"));
  assert.ok(src.includes("outcome: 'error'"));
  assert.ok(src.includes("outcome: 'slow'"));
  assert.ok(src.includes('elapsed_ms: elapsedMs'));
  assert.ok(src.includes('sql_state: sqlState'));
  assert.ok(src.includes('/^[0-9A-Z]{5}$/'));
  assert.ok(src.includes('if (elapsedMs >= 1500)'));
  assert.ok(src.includes('Array.isArray(data) ? data.length : 0'));
  assert.ok(src.includes('throw new Error(`STOREFRONT_CARD_READ_MODEL_READ_FAILED:'));
  assert.ok(src.includes('STOREFRONT_CARD_READ_MODEL_COUNT_MISMATCH'));
  assert.ok(src.includes('STOREFRONT_CARD_READ_MODEL_IDENTITY_MISMATCH'));
  assert.ok(src.includes('STOREFRONT_CARD_READ_MODEL_FACET_CONTRACT_MISMATCH'));
  assert.ok(src.includes('STOREFRONT_CARD_READ_MODEL_HASH_MISMATCH'));
  // Only status, SQLSTATE, elapsed time and number of rows may enter telemetry.
  assert.ok(!src.includes('console.warn(error)'));
  assert.ok(!src.includes('console.log(data)'));
  assert.ok(!src.includes('JSON.stringify(data)'));
  assert.ok(!src.includes('console.info(CARD_SELECT)'));
  assert.ok(!src.includes("FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE"));
  assert.ok(!src.includes('createPaymentSession'));
});

test('catalog source timing only extends existing slow/error event, never product output',()=>{
 const src=readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
 const client=readFileSync('lib/supabaseAdmin.ts','utf8');
 assert.ok(src.includes('newCatalogSourceTiming()'));
 assert.ok(src.includes('createTimedCatalogFetch(timing, globalThis.fetch)'));
 assert.ok(src.includes('catalogSourceTimingFields(timing, elapsedMs)'));
 assert.equal(src.split('...timingFields').length-1,2);
 assert.ok(client.includes('fetchImpl ? { global: { fetch: fetchImpl } } : {}'));
 assert.ok(src.includes("if (elapsedMs >= 1500)"));
 assert.ok(!src.includes('JSON.stringify(headers)'));
 assert.ok(!src.includes('console.log(response)'));
});
