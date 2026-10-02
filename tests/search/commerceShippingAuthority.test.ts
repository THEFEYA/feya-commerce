import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  COMMERCE_SHIPPING_QUOTE_CONTRACT,
  CommerceShippingQuoteError,
  parseCommerceShippingQuoteRequest,
  parseCommerceShippingQuoteReceipt,
} from '../../lib/commerceShippingQuoteStorage.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;

const request=()=>({
  contract_version:COMMERCE_SHIPPING_QUOTE_CONTRACT,
  request_id:id(1),
  order_intent_id:id(2),
  shipping_method:'standard' as const,
});

test('shipping quote request accepts no client amount or currency',()=>{
  const parsed=parseCommerceShippingQuoteRequest(request());
  assert.equal(parsed.shipping_method,'standard');
  assert.throws(
    ()=>parseCommerceShippingQuoteRequest({...request(),amount_minor:1900}),
    (error:any)=>error instanceof CommerceShippingQuoteError&&error.message==='shipping_quote_request_invalid',
  );
  assert.throws(
    ()=>parseCommerceShippingQuoteRequest({...request(),currency:'EUR'}),
    /shipping_quote_request_invalid/,
  );
});

test('shipping quote receipt stays payment/order/provider fail-closed',()=>{
  const req=request();
  const receipt=parseCommerceShippingQuoteReceipt({
    contract_version:COMMERCE_SHIPPING_QUOTE_CONTRACT,
    shipping_quote_receipt_id:id(3),
    request_id:req.request_id,
    order_intent_id:req.order_intent_id,
    shipping_rate_version_id:id(4),
    shipping_method:req.shipping_method,
    currency:'EUR',
    destination_scope:'GLOBAL',
    amount_minor:0,
    authority_type:'HUMAN_OWNER',
    authority_ref:'owner-approved-shipping-rate-v1',
    expires_at:null,
    order_creation_enabled:false,
    payment_enabled:false,
    provider_session_enabled:false,
    replayed:false,
  },req);
  assert.equal(receipt.amount_minor,0);
  assert.equal(receipt.payment_enabled,false);
  assert.throws(
    ()=>parseCommerceShippingQuoteReceipt({...receipt,payment_enabled:true},req),
    /shipping_quote_receipt_invalid/,
  );
});

test('shipping migration installs schema but deliberately seeds zero rates',()=>{
  const sql=readFileSync('supabase/migrations/20261002143000_commerce_shipping_quote_foundation_v1.sql','utf8');
  for(const invariant of [
    'feya_commerce_shipping_rate_versions_v1',
    'feya_commerce_shipping_rate_heads_v1',
    'feya_commerce_shipping_quote_receipts_v1',
    "authority_type in ('HUMAN_OWNER','PROVIDER')",
    "destination_scope='GLOBAL'",
    "'client_amounts_accepted',false",
    "'shipping_authority_ready',ready and active_standard=1 and active_express=1",
    "'order_creation_enabled',false",
    "'payment_enabled',false",
    "'provider_session_enabled',false",
    'shipping_quote_rate_not_configured',
  ])assert.ok(sql.includes(invariant),invariant);

  assert.doesNotMatch(sql,/insert\s+into\s+public\.feya_commerce_shipping_rate_versions_v1/i);
});

test('public shipping quote endpoint remains disabled and same-origin by default',()=>{
  const server=readFileSync('lib/commerceShippingQuoteServer.ts','utf8');
  const route=readFileSync('app/api/commerce/shipping-quotes/route.ts','utf8');
  assert.match(server,/FEYA_COMMERCE_SHIPPING_QUOTE_ENABLED==='true'/);
  assert.match(route,/shipping_quote_same_origin_required/);
  assert.match(route,/length>16384/);
  assert.match(route,/X-Robots-Tag':'noindex, nofollow'/);
});
