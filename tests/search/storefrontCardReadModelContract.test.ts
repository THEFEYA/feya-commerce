import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('storefront card read model is additive, exact-corpus and server-only', () => {
  const source = readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  const migration = readFileSync('supabase/migrations/20260930231500_storefront_product_card_read_model_v1.sql','utf8');
  const parity = readFileSync('supabase/migrations/20260930232500_storefront_product_card_price_parity_v2.sql','utf8');

  assert.ok(source.startsWith("import 'server-only';"));
  assert.ok(source.includes("STOREFRONT_CARD_READ_MODEL_EXPECTED_COUNT = 207"));
  assert.ok(source.includes("Deliberately remains uncached"));
  assert.ok(!source.includes('unstable_cache'));
  assert.ok(!source.includes("'use cache'"));

  assert.ok(migration.includes("source_release_ref = 'feya-review-207-20260924'"));
  assert.ok(migration.includes("snapshot_code='feya-n7-20260928-v3'"));
  assert.ok(migration.includes("revoke all on public.feya_storefront_product_cards_v1 from public, anon, authenticated"));
  assert.ok(migration.includes("grant select on public.feya_storefront_product_cards_v1 to service_role"));
  assert.ok(migration.includes("v_count <> 207"));
  assert.ok(migration.includes('p.media_count::integer as media_count'));

  assert.ok(parity.includes('p.media_count::integer as media_count'));
  assert.ok(parity.includes('distinct on (label_norm)'));
  assert.ok(parity.includes('option_price desc nulls last'));
  assert.ok(parity.includes("grant select on public.feya_storefront_product_cards_v1 to service_role"));
});

test('slim card projection does not expose heavyweight gallery or configuration payloads', () => {
  const source = readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
  const selectBlock = source.slice(source.indexOf('const CARD_SELECT'), source.indexOf('/**'));
  assert.ok(!selectBlock.includes('media_gallery'));
  assert.ok(!selectBlock.includes('configurations'));
  assert.ok(selectBlock.includes('card_display_price_amount'));
  assert.ok(selectBlock.includes('membership_codes'));
});
