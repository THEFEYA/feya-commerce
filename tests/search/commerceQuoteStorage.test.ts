import assert from 'node:assert/strict';
import test from 'node:test';
import {
  COMMERCE_QUOTE_CREATE_RPC,
  COMMERCE_QUOTE_HEALTH_RPC,
  createCommerceQuote,
  parseCommerceQuoteReceipt,
} from '../../lib/commerceQuoteStorage.ts';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const request = () => ({
  request_id: id(1), canonical_product_id: id(2), variant_id: id(3), configuration_price_id: id(4),
  color_id: id(5), size_id: null, expected_product_revision: 7, expected_offer_revision: 2, quantity: 2,
});
const response = () => ({
  contract_version: 'commerce_quote_receipt_v1', quote_receipt_id: id(6), request_id: id(1),
  offer_revision_id: id(7), offer_revision: 2, canonical_product_id: id(2), product_revision: 7,
  variant_id: id(3), configuration_price_id: id(4), color_id: id(5), size_id: null, quantity: 2,
  unit_amount_minor: 10000, line_amount_minor: 20000, currency: 'EUR', price_quote_id: id(8),
  price_revision: 1, price_source: 'configuration_base', release_ref: 'synthetic-release',
  expires_at: null, order_creation_enabled: false, payment_enabled: false, replayed: false,
});

test('storage adapter requires a healthy private quote contract before writing a receipt', async () => {
  const calls: string[] = [];
  const client = { rpc: async (name: string) => {
    calls.push(name);
    if (name === COMMERCE_QUOTE_HEALTH_RPC) return { data: {
      contract_version:'commerce_quote_receipt_v1',ready:true,offer_projection_write_enabled:false,
      quote_receipt_write_enabled:true,order_creation_enabled:false,payment_enabled:false,indexing_enabled:false,
    }, error:null };
    return { data: response(), error:null };
  }};
  const result = await createCommerceQuote(client, request());
  assert.deepEqual(calls, [COMMERCE_QUOTE_HEALTH_RPC, COMMERCE_QUOTE_CREATE_RPC]);
  assert.equal(result.line_amount_minor, 20000);
});

test('unhealthy or unexpectedly permissive health surface closes quote creation', async () => {
  for (const patch of [{ ready:false }, { offer_projection_write_enabled:true }, { payment_enabled:true }, { indexing_enabled:true }]) {
    let calls=0;
    const client = { rpc: async () => { calls++; return { data: {
      contract_version:'commerce_quote_receipt_v1',ready:true,offer_projection_write_enabled:false,
      quote_receipt_write_enabled:true,order_creation_enabled:false,payment_enabled:false,indexing_enabled:false,...patch,
    }, error:null }; }};
    await assert.rejects(createCommerceQuote(client, request()), /quote_contract_not_ready/);
    assert.equal(calls,1);
  }
});

test('receipt parser rejects amount, identity and capability drift', () => {
  const good=request();
  for (const patch of [
    { line_amount_minor:19999 }, { currency:'usd' }, { variant_id:id(99) },
    { order_creation_enabled:true }, { payment_enabled:true }, { expires_at:'2026-09-25T12:00:00Z' },
  ]) assert.throws(() => parseCommerceQuoteReceipt({ ...response(), ...patch }, good), /quote_receipt_invalid/);
});

test('client cannot smuggle monetary fields before the RPC is called', async () => {
  let calls=0;
  const client={rpc:async()=>{calls++;return {data:null,error:null};}};
  await assert.rejects(createCommerceQuote(client,{...request(),unit_amount_minor:1}),/order_quote_request_invalid/);
  assert.equal(calls,0);
});
