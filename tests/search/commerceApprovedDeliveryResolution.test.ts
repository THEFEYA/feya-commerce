import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { APPROVED_DELIVERY_CONTEXT, APPROVED_DELIVERY_RESOLUTION, parseApprovedDeliveryRequest, resolveApprovedDelivery } from '../../lib/commerceApprovedDeliveryResolution.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryCatalog, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';
import type { QuoteRPCClient } from '../../lib/commerceQuoteStorage.ts';

const quoteId = randomUUID(), approvalId = randomUUID(), now = '2026-10-08T10:00:00.000Z';
const request = () => ({ contract_version: APPROVED_DELIVERY_RESOLUTION, quote_receipt_ids: [quoteId], country: 'US', postal_code: '12 345', shipping_method: 'standard' });
const context = () => ({ contract_version: APPROVED_DELIVERY_CONTEXT, calculated_at: now,
  public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false,
  approval: { contract_version: 'commerce_delivery_approval_v1', revision: 1, approval_id: approvalId,
    workspace_version_id: deliveryIds.version, workspace_revision: 1, snapshot_sha256: 'a'.repeat(64), catalog_sha256: 'b'.repeat(64), approved_at: now,
    public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false },
  approved_workspace: { contract_version: 'commerce_delivery_workspace_draft_v1', revision: 1, version_id: deliveryIds.version,
    snapshot_sha256: 'a'.repeat(64), draft: syntheticDeliveryWorkspace(), updated_at: now,
    public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false },
  catalog: structuredClone(syntheticDeliveryCatalog), catalog_sha256: 'b'.repeat(64),
  merchandise: [{ quote_receipt_id: quoteId, canonical_product_id: deliveryIds.product, configuration_price_id: deliveryIds.configuration,
    variant_id: randomUUID(), color_id: null, size_id: null, quantity: 1, unit_amount_minor: 12345, line_amount_minor: 12345,
    currency: 'EUR', offer_revision_id: randomUUID(), price_quote_id: randomUUID(), price_revision: 1, release_ref: 'synthetic-release' }] });
function client(data: unknown): QuoteRPCClient {
  return { rpc: async (name, args) => { assert.equal(name, 'feya_commerce_approved_delivery_context_v1');
    assert.deepEqual(Object.keys(args || {}), ['p_quote_receipt_ids']); return { data, error: null }; } };
}

test('server authority yields bound estimated dates and amounts without a persisted or payable receipt', async () => {
  const result = await resolveApprovedDelivery(client(context()), request());
  assert.equal(result.shipping_amount_minor, 1900); assert.equal(result.currency, 'EUR');
  assert.equal(result.approval_id, approvalId); assert.equal(result.workspace_version_id, deliveryIds.version);
  assert.equal(result.postal_code, '12345'); assert.equal(result.calculated_at, now); assert.equal(result.start_basis, 'preview_ready_now');
  assert.equal(result.persisted, false); assert.equal(result.payable, false); assert.equal(result.public_rates_enabled, false);
  assert.equal(result.payment_enabled, false); assert.equal(result.provider_session_enabled, false);
  assert.ok(result.estimated_arrival.from <= result.estimated_arrival.to);
});
test('client prices, quantities, readiness and timestamps are rejected before any database access', async () => {
  for (const extra of [{ amount_minor: 1 }, { currency: 'USD' }, { quantity: 1 }, { specifications_ready: true }, { calculated_at: now }]) {
    await assert.rejects(resolveApprovedDelivery({ rpc: () => { throw new Error('RPC must not execute'); } }, { ...request(), ...extra }), /request_invalid/);
  }
  for (const ids of [[], [quoteId, quoteId], [null], Array.from({ length: 21 }, () => randomUUID())]) assert.throws(() => parseApprovedDeliveryRequest({ ...request(), quote_receipt_ids: ids }), /request_invalid/);
});
test('native PostgreSQL microsecond/offset timestamps normalize to the same server instant for calendar arithmetic', async () => {
  const c = context(); c.calculated_at = '2026-10-08T12:00:00.123456+02:00';
  const result = await resolveApprovedDelivery(client(c), request());
  assert.equal(result.calculated_at, '2026-10-08T10:00:00.123Z');
  assert.equal(result.parcels[0].estimate.ready_at, result.calculated_at);
});
test('approved identity, snapshot and catalog drift fail closed; response flags cannot enable commerce', async () => {
  for (const change of [
    (c: ReturnType<typeof context>) => { c.approved_workspace.version_id = randomUUID(); },
    (c: ReturnType<typeof context>) => { c.approved_workspace.snapshot_sha256 = 'f'.repeat(64); },
    (c: ReturnType<typeof context>) => { c.catalog_sha256 = 'f'.repeat(64); },
    (c: ReturnType<typeof context>) => { c.payment_enabled = true; },
  ]) { const c = context(); change(c); await assert.rejects(resolveApprovedDelivery(client(c), request()), /authority_mismatch|context_invalid/); }
});
test('basket evidence changes for a new variant, quantity or receipt; destination canonicalization is stable', async () => {
  const c = context(), original = await resolveApprovedDelivery(client(c), request());
  const spaced = await resolveApprovedDelivery(client(c), { ...request(), postal_code: '12-345' });
  assert.equal(spaced.basket_sha256, original.basket_sha256); assert.equal(spaced.destination_sha256, original.destination_sha256);
  const otherPostal = await resolveApprovedDelivery(client(c), { ...request(), postal_code: '54321' });
  assert.notEqual(otherPostal.destination_sha256, original.destination_sha256);
  c.merchandise[0].variant_id = randomUUID();
  assert.notEqual((await resolveApprovedDelivery(client(c), request())).basket_sha256, original.basket_sha256);
  c.merchandise[0].quantity = 2; c.merchandise[0].line_amount_minor *= 2;
  assert.notEqual((await resolveApprovedDelivery(client(c), request())).basket_sha256, original.basket_sha256);
});
test('two variant receipts sharing a configuration consume aggregate parcel capacity', async () => {
  const c = context(), second = { ...c.merchandise[0], quote_receipt_id: randomUUID(), variant_id: randomUUID(), quantity: 3, line_amount_minor: 37035 };
  c.merchandise.push(second);
  const r = { ...request(), quote_receipt_ids: [second.quote_receipt_id, quoteId] };
  assert.equal((await resolveApprovedDelivery(client(c), r)).parcels[0].quantity, 4);
  c.merchandise[0].quantity = 2; c.merchandise[0].line_amount_minor = 24690;
  await assert.rejects(resolveApprovedDelivery(client(c), r), /parcel_capacity_exceeded/);
});
test('country/postal rules and explicit method exclusions apply to the approved snapshot', async () => {
  const c = context(); c.approved_workspace.draft.shipping_profiles[0].rules.push({ id: randomUUID(), scope: 'postal_prefix', countries: ['US'], postal_prefix: '99',
    standard: null, express: null });
  await assert.rejects(resolveApprovedDelivery(client(c), { ...request(), postal_code: '' }), /postal_code_required/);
  await assert.rejects(resolveApprovedDelivery(client(c), { ...request(), postal_code: '99123' }), /method_unavailable/);
  await assert.rejects(resolveApprovedDelivery(client(c), { ...request(), country: 'SA' }), /country_not_served/);
  assert.equal((await resolveApprovedDelivery(client(c), { ...request(), shipping_method: 'express' })).shipping_amount_minor, 3500);
});
test('unconfirmed custom specifications and foreign-currency offers cannot acquire a promise or converted rate', async () => {
  const c = context(); c.approved_workspace.draft.production_profiles[0].requires_specifications = true;
  await assert.rejects(resolveApprovedDelivery(client(c), request()), /specifications_not_ready/);
  c.approved_workspace.draft.production_profiles[0].requires_specifications = false; c.merchandise[0].currency = 'USD';
  await assert.rejects(resolveApprovedDelivery(client(c), request()), /currency_mismatch/);
});
test('missing, duplicated or malformed server receipts and storage outages fail closed', async () => {
  for (const change of [
    (c: ReturnType<typeof context>) => { c.merchandise = []; },
    (c: ReturnType<typeof context>) => { c.merchandise[0].quote_receipt_id = randomUUID(); },
    (c: ReturnType<typeof context>) => { c.merchandise[0].line_amount_minor = 1; },
  ]) { const c = context(); change(c); await assert.rejects(resolveApprovedDelivery(client(c), request()), /context_invalid/); }
  await assert.rejects(resolveApprovedDelivery({ rpc: async () => ({ data: null, error: { code: 'P0001', message: 'approved_delivery_quote_not_current' } }) }, request()), /quote_not_current/);
  await assert.rejects(resolveApprovedDelivery({ rpc: async () => { throw new Error('network error'); } }, request()), /storage_unavailable/);
});
