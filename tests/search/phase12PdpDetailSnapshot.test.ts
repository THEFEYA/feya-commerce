import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Phase 12 PDP detail snapshot removes heavyweight runtime joins while preserving governance',()=>{
  const sql=readFileSync('supabase/migrations/20261001203000_phase12_pdp_detail_snapshot_v1.sql','utf8');
  for(const invariant of [
    'feya_storefront_product_detail_snapshots_v1',
    'FEYA_DETAIL_SNAPSHOT_COUNT_MISMATCH',
    'FEYA_DETAIL_SNAPSHOT_MISSING_GALLERY',
    'FEYA_DETAIL_SNAPSHOT_MISSING_CONFIGURATIONS',
    'feya_storefront_approved_product_bindings_v1',
    "d.status='approved_draft'",
    "d.review_status='approved'",
    'd.updated_at=b.draft_updated_at_snapshot',
    "sp.portfolio_status='active'",
    'coalesce(pd.do_not_publish_flag,false)=false',
    'FEYA_GOVERNED_DETAIL_VIEW_COUNT_MISMATCH',
    "grant select on public.feya_storefront_product_detail_snapshots_v1 to service_role",
  ]) assert.ok(sql.includes(invariant),invariant);

  const replacement=sql.slice(sql.lastIndexOf('create or replace view public.feya_storefront_product_details_v1'));
  assert.doesNotMatch(replacement,/feya_commerce_v_step7_storefront_products_api_v4/);
  assert.doesNotMatch(replacement,/feya_commerce_v_step7_product_media_gallery_fast_v1/);
});
