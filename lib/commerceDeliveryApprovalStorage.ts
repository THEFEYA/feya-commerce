import { DELIVERY_APPROVAL_CONTRACT, deliveryApprovalReadiness } from './commerceDeliveryApproval.ts';
import { DeliveryWorkspaceStorageError, parseDeliveryCatalog, parseDeliveryWorkspaceState, type DeliveryWorkspaceState } from './commerceDeliveryWorkspaceStorage.ts';
import type { DeliveryCatalogProduct } from './commerceDeliveryWorkspace.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

export type DeliveryApprovalState = {
  contract_version: typeof DELIVERY_APPROVAL_CONTRACT; revision: number; approval_id: string | null;
  workspace_version_id: string | null; workspace_revision: number | null; snapshot_sha256: string | null;
  catalog_sha256: string | null; approved_at: string | null;
  public_rates_enabled: false; payment_enabled: false; provider_session_enabled: false;
};
export type DeliveryApprovalContext = { workspace: DeliveryWorkspaceState; catalog: DeliveryCatalogProduct[]; catalog_sha256: string; approval: DeliveryApprovalState };
export type DeliveryApprovalRequest = {
  action: 'approve'; request_id: string; expected_revision: number;
  expected_workspace_version_id: string; expected_workspace_revision: number;
  expected_snapshot_sha256: string; expected_catalog_sha256: string; business_review_confirmed: true;
};
export type DeliveryApprovalReceipt = DeliveryApprovalState & { request_id: string; replayed: boolean };
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const closed = (v: Record<string, unknown>) => v.public_rates_enabled === false && v.payment_enabled === false && v.provider_session_enabled === false;
function failure(code: string, status = 503): never { throw new DeliveryWorkspaceStorageError(code, status); }
function rpcFailure(error: { code?: string; message?: string }): never {
  const code = error.message || '';
  if (error.code === 'P0001' && /^delivery_approval_[a-z_]+$/.test(code)) failure(code, /conflict/.test(code) ? 409 : /boundary/.test(code) ? 503 : 422);
  failure('delivery_approval_outcome_unknown');
}
export function parseDeliveryApprovalState(input: unknown): DeliveryApprovalState {
  if (!record(input) || input.contract_version !== DELIVERY_APPROVAL_CONTRACT || !closed(input)
    || !Number.isSafeInteger(input.revision) || Number(input.revision) < 0
    || (input.revision === 0 ? ['approval_id','workspace_version_id','workspace_revision','snapshot_sha256','catalog_sha256','approved_at'].some(k => input[k] !== null)
      : !uuid(input.approval_id) || !uuid(input.workspace_version_id) || !Number.isSafeInteger(input.workspace_revision) || Number(input.workspace_revision) < 1
        || !hash(input.snapshot_sha256) || !hash(input.catalog_sha256) || typeof input.approved_at !== 'string' || !Number.isFinite(Date.parse(input.approved_at)))) {
    failure('delivery_approval_response_invalid');
  }
  return input as unknown as DeliveryApprovalState;
}
export function parseDeliveryApprovalRequest(input: unknown): DeliveryApprovalRequest {
  if (!record(input) || Object.keys(input).sort().join(',') !== 'action,business_review_confirmed,expected_catalog_sha256,expected_revision,expected_snapshot_sha256,expected_workspace_revision,expected_workspace_version_id,request_id'
    || input.action !== 'approve' || !uuid(input.request_id) || !uuid(input.expected_workspace_version_id)
    || !hash(input.expected_snapshot_sha256) || !hash(input.expected_catalog_sha256) || input.business_review_confirmed !== true
    || !Number.isSafeInteger(input.expected_revision) || Number(input.expected_revision) < 0 || Number(input.expected_revision) >= Number.MAX_SAFE_INTEGER
    || !Number.isSafeInteger(input.expected_workspace_revision) || Number(input.expected_workspace_revision) < 1) failure('delivery_approval_request_invalid', 400);
  return input as unknown as DeliveryApprovalRequest;
}
export async function readDeliveryApprovalContext(client: QuoteRPCClient): Promise<DeliveryApprovalContext> {
  const { data, error } = await client.rpc('feya_commerce_delivery_approval_context_v1');
  if (error) rpcFailure(error);
  if (!record(data) || !hash(data.catalog_sha256)) failure('delivery_approval_response_invalid');
  return { workspace: parseDeliveryWorkspaceState(data.workspace), catalog: parseDeliveryCatalog(data.catalog),
    catalog_sha256: data.catalog_sha256, approval: parseDeliveryApprovalState(data.approval) };
}
export async function approveDeliveryWorkspace(client: QuoteRPCClient, raw: unknown, trustedActorId: string): Promise<DeliveryApprovalReceipt> {
  const request = parseDeliveryApprovalRequest(raw);
  if (!uuid(trustedActorId)) failure('delivery_approval_actor_invalid', 403);
  const args = { p_request_id: request.request_id, p_expected_revision: request.expected_revision,
    p_workspace_version_id: request.expected_workspace_version_id, p_workspace_revision: request.expected_workspace_revision,
    p_snapshot_sha256: request.expected_snapshot_sha256, p_catalog_sha256: request.expected_catalog_sha256,
    p_business_review_confirmed: true, p_actor_id: trustedActorId };
  function receipt(data: unknown): DeliveryApprovalReceipt {
    const state = parseDeliveryApprovalState(data);
    if (!record(data) || data.request_id !== request.request_id || typeof data.replayed !== 'boolean'
      || state.revision !== request.expected_revision + 1 || state.workspace_version_id !== request.expected_workspace_version_id
      || state.workspace_revision !== request.expected_workspace_revision || state.snapshot_sha256 !== request.expected_snapshot_sha256
      || state.catalog_sha256 !== request.expected_catalog_sha256) failure('delivery_approval_outcome_unknown');
    return data as unknown as DeliveryApprovalReceipt;
  }
  // A null validation only looks up an exact existing result; it can never create approval.
  // This lets an old successful request be retried after the draft/approved head changes.
  const lookup = await client.rpc('feya_commerce_approve_delivery_workspace_v1', { ...args, p_validation: null });
  if (lookup.error) rpcFailure(lookup.error);
  if (lookup.data !== null) {
    const existing = receipt(lookup.data); if (!existing.replayed) failure('delivery_approval_outcome_unknown'); return existing;
  }
  const context = await readDeliveryApprovalContext(client);
  if (context.workspace.version_id !== request.expected_workspace_version_id || context.workspace.revision !== request.expected_workspace_revision
    || context.workspace.snapshot_sha256 !== request.expected_snapshot_sha256 || context.catalog_sha256 !== request.expected_catalog_sha256
    || context.approval.revision !== request.expected_revision) failure('delivery_approval_revision_conflict', 409);
  const validation = deliveryApprovalReadiness(context.workspace.draft, context.catalog);
  if (!validation.ready) failure('delivery_approval_settings_incomplete', 422);
  const result = await client.rpc('feya_commerce_approve_delivery_workspace_v1', { ...args, p_validation: validation });
  if (result.error) rpcFailure(result.error);
  return receipt(result.data);
}
