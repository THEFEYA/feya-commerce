import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { approveDeliveryWorkspace, parseDeliveryApprovalRequest, readDeliveryApprovalContext } from '../../lib/commerceDeliveryApprovalStorage.ts';
import { DELIVERY_APPROVAL_CONTRACT } from '../../lib/commerceDeliveryApproval.ts';
import { DELIVERY_WORKSPACE_CONTRACT } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace as draft, syntheticDeliveryCatalog as catalog } from '../fixtures/commerceDeliveryWorkspace.ts';

const flags = { public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false };
const context = () => ({ workspace: { contract_version: DELIVERY_WORKSPACE_CONTRACT, revision: 1, version_id: randomUUID(), snapshot_sha256: 'a'.repeat(64), draft: draft(), updated_at: '2026-10-08T10:00:00Z', ...flags }, catalog, catalog_sha256: 'b'.repeat(64),
  approval: { contract_version: DELIVERY_APPROVAL_CONTRACT, revision: 0, approval_id: null, workspace_version_id: null, workspace_revision: null, snapshot_sha256: null, catalog_sha256: null, approved_at: null, ...flags } });
const request = (c: ReturnType<typeof context>) => ({ action: 'approve' as const, request_id: randomUUID(), expected_revision: 0,
  expected_workspace_version_id: c.workspace.version_id, expected_workspace_revision: c.workspace.revision,
  expected_snapshot_sha256: c.workspace.snapshot_sha256, expected_catalog_sha256: c.catalog_sha256, business_review_confirmed: true as const });
const receipt = (r: ReturnType<typeof request>, replayed = false) => ({ contract_version: DELIVERY_APPROVAL_CONTRACT, request_id: r.request_id, approval_id: randomUUID(), revision: r.expected_revision + 1,
  workspace_version_id: r.expected_workspace_version_id, workspace_revision: r.expected_workspace_revision, snapshot_sha256: r.expected_snapshot_sha256,
  catalog_sha256: r.expected_catalog_sha256, approved_at: '2026-10-08T10:00:01Z', replayed, ...flags });

test('approval never accepts browser actor, readiness, payment, clock or unconfirmed business review', () => {
  const r = request(context());
  for (const extra of [{ actor_id: randomUUID() }, { validation: { ready: true } }, { payment_enabled: true }, { approved_at: 'now' }, { business_review_confirmed: false }]) assert.throws(() => parseDeliveryApprovalRequest({ ...r, ...extra }), /request_invalid/);
});
test('new approval derives validation from one protected context and binds trusted owner and exact hashes', async () => {
  const c = context(), r = request(c), actor = randomUUID(); let calls = 0;
  const result = await approveDeliveryWorkspace({ rpc: async (name, args) => {
    calls++; if (name === 'feya_commerce_delivery_approval_context_v1') return { data: c, error: null };
    assert.equal(args?.p_actor_id, actor); assert.equal(args?.p_catalog_sha256, c.catalog_sha256); assert.equal(args?.p_snapshot_sha256, c.workspace.snapshot_sha256);
    if (calls === 1) { assert.equal(args?.p_validation, null); return { data: null, error: null }; }
    const v = args?.p_validation as { ready: boolean; configuration_count: number; public_rates_enabled: boolean };
    assert.equal(v.ready, true); assert.equal(v.configuration_count, 2); assert.equal(v.public_rates_enabled, false);
    return { data: receipt(r), error: null };
  } }, r, actor);
  assert.equal(calls, 3); assert.equal(result.replayed, false); assert.equal(result.payment_enabled, false);
});
test('old successful retry returns its exact receipt without requiring the current draft or moving a head', async () => {
  const r = request(context()); let calls = 0;
  const result = await approveDeliveryWorkspace({ rpc: async (_name, args) => { calls++; assert.equal(args?.p_validation, null); return { data: receipt(r, true), error: null }; } }, r, randomUUID());
  assert.equal(calls, 1); assert.equal(result.replayed, true);
});
test('changed draft, approval head, catalog or hash stop a fresh request before writing', async () => {
  for (const change of ['version','revision','hash','catalog','approval']) {
    const c = context(), r = request(c); let writes = 0;
    if (change === 'version') c.workspace.version_id = randomUUID(); if (change === 'revision') c.workspace.revision = 2;
    if (change === 'hash') c.workspace.snapshot_sha256 = 'c'.repeat(64); if (change === 'catalog') c.catalog_sha256 = 'c'.repeat(64); if (change === 'approval') c.approval.revision = 1;
    await assert.rejects(approveDeliveryWorkspace({ rpc: async (name, args) => {
      if (name === 'feya_commerce_delivery_approval_context_v1') {
        if (change === 'approval') return { data: { ...c, approval: { ...receipt(r), revision: 1 } }, error: null };
        return { data: c, error: null };
      }
      if (args?.p_validation !== null) writes++; return { data: null, error: null };
    } }, r, randomUUID()), e => (e as { status: number }).status === 409);
    assert.equal(writes, 0);
  }
});
test('incomplete or wrong-currency profiles cannot reach a validation-bearing RPC', async () => {
  const c = context(), r = request(c); c.workspace.draft.shipping_profiles[0].currency = 'USD'; let writes = 0;
  await assert.rejects(approveDeliveryWorkspace({ rpc: async (name, args) => {
    if (name === 'feya_commerce_delivery_approval_context_v1') return { data: c, error: null };
    if (args?.p_validation !== null) writes++; return { data: null, error: null };
  } }, r, randomUUID()), /settings_incomplete/); assert.equal(writes, 0);
});
test('malformed or active-capability responses and uncertain writes never report success', async () => {
  const r = request(context());
  for (const data of [{ ...receipt(r, true), payment_enabled: true }, { ...receipt(r, true), workspace_revision: 99 }, receipt(r, false), undefined]) {
    await assert.rejects(approveDeliveryWorkspace({ rpc: async () => ({ data, error: null }) }, r, randomUUID()));
  }
  await assert.rejects(readDeliveryApprovalContext({ rpc: async () => ({ data: { ...context(), catalog_sha256: 'invalid' }, error: null }) }), /response_invalid/);
});
