import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { APPROVED_SHIPPING_QUOTE_V2, issueApprovedShippingQuoteV2,
  parseApprovedShippingQuoteV2Request } from '../../lib/commerceApprovedShippingQuoteV2.ts';
import { APPROVED_DELIVERY_CONTEXT } from '../../lib/commerceApprovedDeliveryResolution.ts';
import { syntheticDeliveryCatalog, syntheticDeliveryWorkspace, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

const quoteId = randomUUID(), approvalId = randomUUID(), now = '2026-10-08T10:00:00.000Z';
const request = () => ({ contract_version: APPROVED_SHIPPING_QUOTE_V2, request_id: randomUUID(),
  quote_receipt_ids: [quoteId], country: 'US', postal_code: '12 345', shipping_method: 'standard' });
const context = () => ({
  contract_version: APPROVED_DELIVERY_CONTEXT, calculated_at: now,
  public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false,
  approval: { contract_version: 'commerce_delivery_approval_v1', revision: 1, approval_id: approvalId,
    workspace_version_id: deliveryIds.version, workspace_revision: 1, snapshot_sha256: 'a'.repeat(64),
    catalog_sha256: 'b'.repeat(64), approved_at: now, public_rates_enabled: false,
    payment_enabled: false, provider_session_enabled: false },
  approved_workspace: { contract_version: 'commerce_delivery_workspace_draft_v1', revision: 1,
    version_id: deliveryIds.version, snapshot_sha256: 'a'.repeat(64), draft: syntheticDeliveryWorkspace(),
    updated_at: now, public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false },
  catalog: structuredClone(syntheticDeliveryCatalog), catalog_sha256: 'b'.repeat(64),
  merchandise: [{ quote_receipt_id: quoteId, canonical_product_id: deliveryIds.product,
    configuration_price_id: deliveryIds.configuration, variant_id: randomUUID(), color_id: null, size_id: null,
    quantity: 1, unit_amount_minor: 12345, line_amount_minor: 12345, currency: 'EUR',
    offer_revision_id: randomUUID(), price_quote_id: randomUUID(), price_revision: 1, release_ref: 'synthetic-release' }],
});
function receipt(req: ReturnType<typeof request>, resolution: any) {
  return { contract_version: APPROVED_SHIPPING_QUOTE_V2, shipping_quote_receipt_id: randomUUID(),
    request_id: req.request_id, approval_id: approvalId, approval_revision: 1,
    workspace_version_id: deliveryIds.version, workspace_revision: 1, catalog_sha256: 'b'.repeat(64),
    basket_sha256: resolution.basket_sha256, destination_sha256: resolution.destination_sha256,
    country: req.country, shipping_method: req.shipping_method, currency: 'EUR',
    amount_minor: resolution.shipping_amount_minor, parcel_count: resolution.parcel_count,
    estimated_arrival: resolution.estimated_arrival, created_at: '2026-10-08T10:00:01Z',
    expires_at: '2026-10-08T10:15:01Z', start_basis: 'preview_ready_now',
    persisted: true, payable: false, public_rates_enabled: false,
    payment_enabled: false, provider_session_enabled: false, replayed: false, expired: false };
}

test('v2 server-only chain fetches exact merchandise, resolves amount and stores immutable nonpayable receipt', async () => {
  const req = request(), calls: string[] = [];
  const client = { rpc: async (name: string, args: any) => {
    calls.push(name);
    if (name === 'feya_commerce_lookup_approved_shipping_quote_v2')
      return { data: null, error: null };
    if (name === 'feya_commerce_approved_delivery_context_v1') {
      assert.deepEqual(args.p_quote_receipt_ids, [quoteId]);
      return { data: context(), error: null };
    }
    if (name === 'feya_commerce_create_approved_shipping_quote_v2') {
      assert.equal(args.p_request.postal_code, '12345');
      assert.equal(args.p_resolution.shipping_amount_minor, 1900);
      assert.equal(args.p_resolution.payable, false);
      assert.equal(args.p_resolution.persisted, false);
      return { data: receipt(req, args.p_resolution), error: null };
    }
    throw Error('Unexpected RPC ' + name);
  }};
  const result = await issueApprovedShippingQuoteV2(client, req);
  assert.equal(result.persisted, true); assert.equal(result.payable, false);
  assert.equal(result.amount_minor, 1900); assert.equal(result.currency, 'EUR');
  assert.equal(result.payment_enabled, false); assert.equal(result.provider_session_enabled, false);
  assert.deepEqual(calls, ['feya_commerce_lookup_approved_shipping_quote_v2',
    'feya_commerce_approved_delivery_context_v1', 'feya_commerce_create_approved_shipping_quote_v2']);
});

test('idempotent lookup returns original receipt without recalculating after rates change', async () => {
  const req = request(), saved = receipt(req, { basket_sha256: 'b'.repeat(64), destination_sha256: 'd'.repeat(64),
    shipping_amount_minor: 1900, parcel_count: 1, estimated_arrival: { from: '2026-10-28', to: '2026-11-05' } });
  const client = { rpc: async (name: string) => {
    assert.equal(name, 'feya_commerce_lookup_approved_shipping_quote_v2');
    return { data: { ...saved, replayed: true, expired: true }, error: null };
  }};
  const result = await issueApprovedShippingQuoteV2(client, req);
  assert.equal(result.replayed, true); assert.equal(result.expired, true);
  assert.equal(result.amount_minor, 1900); assert.equal(result.payable, false);
});

test('untrusted client monetary, readiness and version claims never reach any RPC', async () => {
  const req = request();
  for (const extra of [{ amount_minor: 100 }, { currency: 'USD' }, { quantity: 8 },
    { approval_id: randomUUID() }, { calculated_at: now }, { expires_at: now },
    { specifications_ready: true }, { payment_enabled: true }]) {
    await assert.rejects(issueApprovedShippingQuoteV2({ rpc: () => { throw Error('should not run'); } }, { ...req, ...extra }),
      /approved_shipping_quote_request_invalid/);
  }
  assert.throws(() => parseApprovedShippingQuoteV2Request({ ...req, quote_receipt_ids: [quoteId, quoteId] }),
    /approved_shipping_quote_request_invalid/);
});

test('server response cannot turn a persisted quote into a payable or provider session authorization', async () => {
  const req = request(), saved = receipt(req, { basket_sha256: 'b'.repeat(64), destination_sha256: 'd'.repeat(64),
    shipping_amount_minor: 1900, parcel_count: 1, estimated_arrival: { from: '2026-10-28', to: '2026-11-05' } });
  for (const changed of [{ payable: true }, { payment_enabled: true }, { provider_session_enabled: true },
    { currency: 'USD' }, { expires_at: 'not-a-date' }]) {
    const client = { rpc: async () => ({ data: { ...saved, ...changed }, error: null }) };
    await assert.rejects(issueApprovedShippingQuoteV2(client, req), /approved_shipping_quote_response_invalid/);
  }
});
