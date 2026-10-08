import { DELIVERY_WORKSPACE_CONTRACT, parseDeliveryWorkspace, validateDeliveryAssignments, type DeliveryWorkspaceDraft, type DeliveryCatalogProduct } from './commerceDeliveryWorkspace.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

export type DeliveryWorkspaceState = {
  contract_version: typeof DELIVERY_WORKSPACE_CONTRACT; revision: number; version_id: string | null;
  snapshot_sha256: string | null; draft: DeliveryWorkspaceDraft | null; updated_at: string | null;
  public_rates_enabled: false; payment_enabled: false; provider_session_enabled: false;
};
export type DeliveryWorkspaceSaveRequest = { action: 'save'; request_id: string; expected_revision: number; draft: DeliveryWorkspaceDraft };
export type DeliveryWorkspaceSaveReceipt = {
  request_id: string; version_id: string; revision: number; snapshot_sha256: string; replayed: boolean;
  public_rates_enabled: false; payment_enabled: false; provider_session_enabled: false;
};
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const closed = (v: Record<string, unknown>) => v.public_rates_enabled === false && v.payment_enabled === false && v.provider_session_enabled === false;
const hash = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
export class DeliveryWorkspaceStorageError extends Error {
  status: number;
  constructor(code: string, status = 503) { super(code); this.status = status; }
}
function rejectRPC(error: { code?: string; message?: string }): never {
  const code = error.message || '';
  if (error.code === 'P0001' && /^delivery_workspace_[a-z_]+$/.test(code)) {
    throw new DeliveryWorkspaceStorageError(code, /conflict|ambiguous/.test(code) ? 409 : /not_ready/.test(code) ? 503 : 422);
  }
  throw new DeliveryWorkspaceStorageError('delivery_workspace_storage_unavailable');
}
export async function readDeliveryWorkspace(client: QuoteRPCClient): Promise<DeliveryWorkspaceState> {
  const { data, error } = await client.rpc('feya_commerce_read_delivery_workspace_v1');
  if (error) rejectRPC(error);
  return parseDeliveryWorkspaceState(data);
}
export function parseDeliveryWorkspaceState(data: unknown): DeliveryWorkspaceState {
  if (!record(data) || data.contract_version !== DELIVERY_WORKSPACE_CONTRACT || !closed(data)
    || !Number.isSafeInteger(data.revision) || Number(data.revision) < 0
    || (data.revision === 0 ? data.version_id !== null || data.snapshot_sha256 !== null || data.draft !== null || data.updated_at !== null
      : !uuid(data.version_id) || !hash(data.snapshot_sha256) || typeof data.updated_at !== 'string' || !Number.isFinite(Date.parse(data.updated_at)))) {
    throw new DeliveryWorkspaceStorageError('delivery_workspace_response_invalid');
  }
  if (data.draft !== null) {
    try { parseDeliveryWorkspace(data.draft); } catch { throw new DeliveryWorkspaceStorageError('delivery_workspace_response_invalid'); }
  }
  return data as unknown as DeliveryWorkspaceState;
}
export async function readDeliveryCatalog(client: QuoteRPCClient): Promise<DeliveryCatalogProduct[]> {
  const { data, error } = await client.rpc('feya_commerce_delivery_catalog_v1');
  if (error) rejectRPC(error);
  return parseDeliveryCatalog(data);
}
export function parseDeliveryCatalog(data: unknown): DeliveryCatalogProduct[] {
  if (!Array.isArray(data) || data.length > 2000 || data.some(p => !record(p) || !uuid(p.canonical_product_id)
    || typeof p.title !== 'string' || !Array.isArray(p.configurations) || p.configurations.some(c => !record(c)
      || !uuid(c.configuration_price_id) || typeof c.name !== 'string' || !Array.isArray(c.currencies)
      || c.currencies.some(v => typeof v !== 'string' || !/^[A-Z]{3}$/.test(v))))) {
    throw new DeliveryWorkspaceStorageError('delivery_catalog_response_invalid');
  }
  return data as DeliveryCatalogProduct[];
}
export function parseDeliverySaveRequest(input: unknown): DeliveryWorkspaceSaveRequest {
  if (!record(input) || Object.keys(input).sort().join(',') !== 'action,draft,expected_revision,request_id'
    || input.action !== 'save' || !uuid(input.request_id) || !Number.isSafeInteger(input.expected_revision)
    || Number(input.expected_revision) < 0 || Number(input.expected_revision) >= Number.MAX_SAFE_INTEGER) {
    throw new DeliveryWorkspaceStorageError('delivery_workspace_request_invalid', 400);
  }
  return { action: 'save', request_id: input.request_id, expected_revision: Number(input.expected_revision), draft: parseDeliveryWorkspace(input.draft) };
}
export async function saveDeliveryWorkspace(client: QuoteRPCClient, input: unknown, trustedActorId: string, catalog: DeliveryCatalogProduct[]): Promise<DeliveryWorkspaceSaveReceipt> {
  const request = parseDeliverySaveRequest(input);
  if (!uuid(trustedActorId)) throw new DeliveryWorkspaceStorageError('delivery_workspace_actor_invalid', 403);
  validateDeliveryAssignments(request.draft, catalog);
  const { data, error } = await client.rpc('feya_commerce_save_delivery_workspace_v1', {
    p_request_id: request.request_id, p_expected_revision: request.expected_revision, p_draft: request.draft, p_actor_id: trustedActorId,
  });
  if (error) rejectRPC(error);
  if (!record(data) || !closed(data) || data.request_id !== request.request_id || !uuid(data.version_id)
    || data.revision !== request.expected_revision + 1 || !hash(data.snapshot_sha256) || typeof data.replayed !== 'boolean') {
    throw new DeliveryWorkspaceStorageError('delivery_workspace_save_outcome_unknown');
  }
  return data as unknown as DeliveryWorkspaceSaveReceipt;
}
