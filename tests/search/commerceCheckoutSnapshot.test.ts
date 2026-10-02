import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT,
  CommerceCheckoutSnapshotError,
  parseCommerceCheckoutSnapshotRequest,
  parseCommerceCheckoutSnapshotReceipt,
} from '../../lib/commerceCheckoutSnapshotStorage.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

const request=()=>({
  contract_version:COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT,
  request_id:id(1),
  order_intent_id:id(2),
  shipping_quote_receipt_id:id(3),
});

test('checkout snapshot request contains only server receipt identities',()=>{
  const parsed=parseCommerceCheckoutSnapshotRequest(request());
  assert.equal(parsed.order_intent_id,id(2));
  assert.throws(
    ()=>parseCommerceCheckoutSnapshotRequest({...request(),total_amount_minor:999}),
    (error:any)=>error instanceof CommerceCheckoutSnapshotError&&error.message==='checkout_snapshot_request_invalid',
  );
  assert.throws(
    ()=>parseCommerceCheckoutSnapshotRequest({...request(),currency:'EUR'}),
    /checkout_snapshot_request_invalid/,
  );
});

test('checkout snapshot receipt is exact total but not a payment/order',()=>{
  const req=request();
  const receipt=parseCommerceCheckoutSnapshotReceipt({
    contract_version:COMMERCE_CHECKOUT_SNAPSHOT_CONTRACT,
    checkout_snapshot_id:id(4),
    request_id:req.request_id,
    order_intent_id:req.order_intent_id,
    shipping_quote_receipt_id:req.shipping_quote_receipt_id,
    policy_bundle_sha256:'a'.repeat(64),
    source_release_ref:'feya-review-207-20260924',
    currency:'EUR',
    line_count:1,
    merchandise_subtotal_minor:10000,
    shipping_amount_minor:1900,
    total_amount_minor:11900,
    checkout_status:'provider_pending',
    transaction_party_bound:false,
    order_creation_enabled:false,
    payment_enabled:false,
    provider_session_enabled:false,
    replayed:false,
  },req);
  assert.equal(receipt.total_amount_minor,11900);
  assert.equal(receipt.payment_enabled,false);
  assert.throws(
    ()=>parseCommerceCheckoutSnapshotReceipt({...receipt,total_amount_minor:11899},req),
    /checkout_snapshot_receipt_invalid/,
  );
});

test('checkout snapshot migration revalidates policy, shipping and current offer truth',()=>{
  const sql=readFileSync('supabase/migrations/20261002150000_commerce_checkout_snapshot_v1.sql','utf8');
  for(const invariant of [
    'feya_commerce_order_intent_policy_acceptance_v1',
    'feya_commerce_checkout_policy_bundle_v1()',
    'feya_commerce_shipping_quote_receipts_v1',
    'feya_commerce_order_intent_items_v1',
    'feya_commerce_quote_receipts_v1',
    'feya_commerce_offer_heads_v1',
    'current_offer_revision_id=q.offer_revision_id',
    "o.status='active'",
    "it.item_status='active'",
    'q.line_amount_minor=oi.line_amount_minor',
    'checkout_snapshot_policy_version_conflict',
    'checkout_snapshot_shipping_quote_expired',
    'checkout_snapshot_quote_not_current',
    "'transaction_party_bound',false",
    "'order_creation_enabled',false",
    "'payment_enabled',false",
    "'provider_session_enabled',false",
  ])assert.ok(sql.includes(invariant),invariant);
  assert.doesNotMatch(sql,/p_payload[^\n]*(?:amount|currency|total)/i);
});

test('checkout snapshot endpoint is same-origin and disabled by default',()=>{
  const server=readFileSync('lib/commerceCheckoutSnapshotServer.ts','utf8');
  const route=readFileSync('app/api/commerce/checkout-snapshots/route.ts','utf8');
  assert.match(server,/FEYA_COMMERCE_CHECKOUT_SNAPSHOT_ENABLED==='true'/);
  assert.match(route,/checkout_snapshot_same_origin_required/);
  assert.match(route,/length>16384/);
  assert.match(route,/X-Robots-Tag':'noindex, nofollow'/);
});
