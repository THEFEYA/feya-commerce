import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  COMMERCE_ORDER_INTENT_CONTRACT,
  CommerceOrderIntentError,
  parseCommerceOrderIntentRequest,
  parseCommerceOrderIntentReceipt,
} from '../../lib/commerceOrderIntentStorage.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

const request=()=>({
  contract_version:COMMERCE_ORDER_INTENT_CONTRACT,
  request_id:id(1),
  quote_receipt_ids:[id(2),id(3)],
  contact:{
    email:'buyer@example.com',
    full_name:'Buyer Example',
    phone:null,
    shipping_address:'1 Example Street, Example City 10000',
    note:null,
  },
  shipping_method:'standard' as const,
  policy_acknowledgement:{accepted:true as const,bundle_sha256:'a'.repeat(64)},
});

test('order intent request accepts identity/contact/quote ids but no browser amounts',()=>{
  const parsed=parseCommerceOrderIntentRequest(request());
  assert.equal(parsed.quote_receipt_ids.length,2);
  assert.equal(parsed.shipping_method,'standard');
  assert.throws(
    ()=>parseCommerceOrderIntentRequest({...request(),total_amount_minor:1}),
    (error:any)=>error instanceof CommerceOrderIntentError&&error.message==='order_intent_request_invalid',
  );
  assert.throws(
    ()=>parseCommerceOrderIntentRequest({...request(),quote_receipt_ids:[id(2),id(2)]}),
    /order_intent_request_invalid/,
  );
});

test('order intent receipt stays shipping/payment/order fail-closed',()=>{
  const req=request();
  const receipt=parseCommerceOrderIntentReceipt({
    contract_version:COMMERCE_ORDER_INTENT_CONTRACT,
    order_intent_id:id(4),
    request_id:req.request_id,
    quote_receipt_ids:req.quote_receipt_ids,
    items_count:2,
    source_release_ref:'feya-review-207-20260924',
    currency:'USD',
    merchandise_subtotal_minor:30000,
    shipping_method:'standard',
    shipping_amount_minor:null,
    total_amount_minor:null,
    intent_status:'quote_bound_shipping_pending',
    shipping_authority_ready:false,
    order_creation_enabled:false,
    payment_enabled:false,
    provider_session_enabled:false,
    policy_bundle_sha256:req.policy_acknowledgement.bundle_sha256,
    policy_accepted:true,
    policy_accepted_at:'2026-10-02T12:00:00.000Z',
    replayed:false,
  },req);
  assert.equal(receipt.merchandise_subtotal_minor,30000);
  assert.equal(receipt.payment_enabled,false);
  assert.throws(
    ()=>parseCommerceOrderIntentReceipt({...receipt,payment_enabled:true},req),
    /order_intent_receipt_invalid/,
  );
});


test('policy acknowledgement is explicit, version-bound and cannot be prechecked by omission',()=>{
  const req=request();
  assert.equal(parseCommerceOrderIntentRequest(req).policy_acknowledgement.accepted,true);
  assert.throws(
    ()=>parseCommerceOrderIntentRequest({...req,policy_acknowledgement:{accepted:false,bundle_sha256:'a'.repeat(64)}}),
    /order_intent_policy_acknowledgement_required/,
  );
  assert.throws(
    ()=>parseCommerceOrderIntentRequest({...req,policy_acknowledgement:{accepted:true,bundle_sha256:'bad'}}),
    /order_intent_policy_acknowledgement_required/,
  );
  const sql=readFileSync('supabase/migrations/20261002134500_commerce_order_intent_policy_v2.sql','utf8');
  for(const invariant of [
    'feya_commerce_checkout_policy_bundle_v1',
    'CHECKOUT_POLICY_ACKNOWLEDGEMENT',
    'RETURN_POLICY_CURRENT',
    'STANDARD_INTERNATIONAL_TRACKED_SHIPPING_TIME',
    'EXPRESS_SHIPPING_TIME',
    'explicit_checkbox_required',
    'prechecked_forbidden',
    'order_intent_policy_version_conflict',
    'feya_commerce_order_intent_policy_acceptance_v1',
  ])assert.ok(sql.includes(invariant),invariant);
});

test('migration reconstructs every order line from immutable current quote authority',()=>{
  const sql=readFileSync('supabase/migrations/20261002131500_commerce_order_intent_v1.sql','utf8');
  for(const invariant of [
    'feya_commerce_quote_receipts_v1',
    'feya_commerce_offer_heads_v1',
    'current_offer_revision_id=q.offer_revision_id',
    "o.status='active'",
    "i.item_status='active'",
    'i.amount_minor=q.unit_amount_minor',
    'i.currency=q.currency',
    'i.price_quote_id=q.price_quote_id',
    'i.price_revision=q.price_revision',
    "'client_amounts_accepted',false",
    "'shipping_authority_ready',false",
    "'order_creation_enabled',false",
    "'payment_enabled',false",
    "'provider_session_enabled',false",
  ])assert.ok(sql.includes(invariant),invariant);

  assert.doesNotMatch(sql,/p_payload[^\n]*(?:amount|currency)/i);
  assert.match(sql,/shipping_amount_minor is null/);
  assert.match(sql,/total_amount_minor is null/);
});

test('public endpoint is disabled by default and accepts only same-origin bounded JSON',()=>{
  const server=readFileSync('lib/commerceOrderIntentServer.ts','utf8');
  const route=readFileSync('app/api/commerce/order-intents/route.ts','utf8');
  assert.match(server,/FEYA_COMMERCE_ORDER_INTENT_ENABLED==='true'/);
  assert.match(route,/order_intent_same_origin_required/);
  assert.match(route,/length>65536/);
  assert.match(route,/X-Robots-Tag':'noindex, nofollow'/);
});
