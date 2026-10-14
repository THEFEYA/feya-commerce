import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const migration=readFileSync('supabase/migrations/20261014214000_phase13_fast_pinned_card_live_eligibility_v3.sql','utf8');
const currentReader=readFileSync('lib/storefrontCardReadModelServer.ts','utf8');
const oldV2=readFileSync('supabase/migrations/20261012193000_phase13_fast_pinned_card_view_v2.sql','utf8');

test('Phase13 additive V3 removes only expensive legacy live existence projection',()=>{
  assert.ok(migration.includes('create view public.feya_storefront_product_cards_fast_v3'));
  assert.ok(migration.includes('WITH live_identity AS'));
  assert.ok(migration.includes('JOIN live_identity live ON live.canonical_product_id = s.canonical_product_id AND live.product_slug = s.product_slug'));
  assert.ok(!migration.includes('feya_storefront_collection_cards_fast_v1'));
  assert.ok(!migration.includes('feya_commerce_v_step7_storefront_products_api_v4'));
  for (const gate of [
    "p.readiness_status='ready_candidate'",
    "p.publish_status='draft'",
    "p.do_not_publish_flag=false",
    "md.assigned_role='product_card_primary'",
    "md.use_publicly_flag=true",
    "md.source_image_url IS NOT NULL",
    "sc.is_public_candidate=true AND sc.is_sampler=false",
    "cp.public_price_amount IS NOT NULL",
    "cp.sampler_excluded_flag=false",
    "cp.price_status='missing_price'",
    "COALESCE(NULLIF(BTRIM(cd.card_title),'')",
    "feya_commerce_slugify(",
  ]) assert.ok(migration.includes(gate),gate);
  for (const immutable of [
    's.content_sha256 AS approved_content_sha256',
    's.card_display_price_amount',
    's.primary_image_url',
    'b.draft_updated_at_snapshot',
    "d.status = 'approved_draft'",
    "d.review_status = 'approved'",
    "sp.portfolio_status = 'active'",
    'fi.parent_components_json',
    'fi.sellable_component_values_json',
    'COALESCE(mc.membership_codes, ARRAY[]::text[])',
    "fm.snapshot_hash AS facet_snapshot_hash",
  ]) {
    assert.ok(migration.includes(immutable),immutable);
    assert.ok(oldV2.includes(immutable),immutable);
  }
  assert.ok(migration.includes('WITH live_identity AS'));
  assert.ok(oldV2.includes('JOIN feya_storefront_collection_cards_fast_v1 live'));
});

test('V3 stays service-only, checks exact 207 + all field hashes, and verifies the independently authorized storefront cutover',()=>{
  assert.ok(migration.includes('with (security_invoker=true)'));
  assert.ok(migration.includes('revoke all on public.feya_storefront_product_cards_fast_v3 from public,anon,authenticated,service_role'));
  assert.ok(migration.includes('grant select on public.feya_storefront_product_cards_fast_v3 to service_role'));
  assert.ok(migration.includes('FEYA_PHASE13_CARD_V3_FIELD_PARITY_FAILED'));
  assert.ok(migration.includes('FEYA_PHASE13_CARD_V3_PARITY_COUNT_FAILED'));
  assert.ok(migration.includes('FEYA_PHASE13_CARD_V3_ACL_FAILED'));
  assert.ok(migration.includes('to_jsonb(v3)'));
  assert.ok(migration.includes('to_jsonb(v2)'));
  assert.ok(migration.includes('n <> 207 or unique_n <> 207 or invalid_n <> 0'));
  assert.ok(currentReader.includes("STOREFRONT_CARD_READ_MODEL_V1 = 'feya_storefront_product_cards_fast_v3'"));
  assert.ok(!migration.includes('create or replace view public.feya_storefront_product_cards_fast_v2'));
  assert.ok(!migration.includes('FEYA_PUBLIC_APPROVED_PDP_COPY_RELEASE='));
  assert.ok(!migration.includes('drop table'));
  assert.ok(!migration.includes('alter table'));
  assert.ok(!migration.includes('createPaymentSession'));
});
