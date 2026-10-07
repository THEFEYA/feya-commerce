import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readDeliveryWorkspace, readDeliveryCatalog, saveDeliveryWorkspace, parseDeliverySaveRequest } from '../../lib/commerceDeliveryWorkspaceStorage.ts';
import { DELIVERY_WORKSPACE_CONTRACT } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace as fixture, syntheticDeliveryCatalog as catalog } from '../fixtures/commerceDeliveryWorkspace.ts';

const flags = { public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false };
const empty = { contract_version: DELIVERY_WORKSPACE_CONTRACT, revision: 0, version_id: null, draft: null, updated_at: null, snapshot_sha256: null, ...flags };
test('storage rejects active capabilities or malformed persisted drafts', async () => {
  assert.equal((await readDeliveryWorkspace({ rpc: async () => ({ data: empty, error: null }) })).revision, 0);
  for (const data of [{ ...empty, payment_enabled: true }, { ...empty, revision: 1 }, { ...empty, revision: '0' }]) await assert.rejects(readDeliveryWorkspace({ rpc: async () => ({ data, error: null }) }), /response_invalid/);
});
test('save binds trusted actor, expected revision and exact draft; receipt never activates rates', async () => {
  const actor = randomUUID(), request = { action: 'save' as const, request_id: randomUUID(), expected_revision: 0, draft: fixture() };
  let called = false;
  const result = await saveDeliveryWorkspace({ rpc: async (name, args) => {
    called = true; assert.equal(name, 'feya_commerce_save_delivery_workspace_v1'); assert.equal(args?.p_actor_id, actor); assert.equal(args?.p_expected_revision, 0); assert.deepEqual(args?.p_draft, request.draft);
    return { data: { request_id: request.request_id, revision: 1, version_id: randomUUID(), snapshot_sha256: 'a'.repeat(64), replayed: false, ...flags }, error: null };
  } }, request, actor, catalog);
  assert.equal(called, true); assert.equal(result.payment_enabled, false);
});
test('forged actor/approval/capability fields and invalid assignments are rejected without a write', async () => {
  const input = { action: 'save', request_id: randomUUID(), expected_revision: 0, draft: fixture() };
  for (const extra of [{ actor_id: randomUUID() }, { public_rates_enabled: true }, { approval_ref: 'fake' }]) assert.throws(() => parseDeliverySaveRequest({ ...input, ...extra }), /request_invalid/);
  input.draft.assignments.push({ canonical_product_id: randomUUID(), configuration_price_id: null, shipping_profile_id: input.draft.shipping_profiles[0].id, production_profile_id: null });
  await assert.rejects(saveDeliveryWorkspace({ rpc: async () => { throw new Error('Must not call'); } }, input, randomUUID(), catalog), /assignment_target_invalid/);
});
test('CAS conflict is actionable while an uncertain write cannot report success', async () => {
  const request = { action: 'save', request_id: randomUUID(), expected_revision: 0, draft: fixture() };
  await assert.rejects(saveDeliveryWorkspace({ rpc: async () => ({ data: null, error: { code: 'P0001', message: 'delivery_workspace_revision_conflict' } }) }, request, randomUUID(), catalog), e => (e as { status: number }).status === 409);
  await assert.rejects(saveDeliveryWorkspace({ rpc: async () => ({ data: { revision: 1 }, error: null }) }, request, randomUUID(), catalog), /save_outcome_unknown/);
});
test('catalog loader accepts server currencies and rejects coercion or missing configuration identity', async () => {
  assert.deepEqual(await readDeliveryCatalog({ rpc: async () => ({ data: catalog, error: null }) }), catalog);
  await assert.rejects(readDeliveryCatalog({ rpc: async () => ({ data: [{ canonical_product_id: 'bad', title: 'bad', configurations: [] }], error: null }) }), /catalog_response_invalid/);
});
