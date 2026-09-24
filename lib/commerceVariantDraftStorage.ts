import { matchesVariantShape, VARIANT_DRAFT_SCHEMA, type VariantDraftInput } from './commerceVariantDraftSchema.ts';
import { validateVariantSnapshot } from './commerceVariantContract.ts';
export const VARIANT_DRAFT_CONTRACT = 'product_variant_draft_v1';
export type VariantRPCClient = { rpc(name: string, args?: Record<string, unknown>): PromiseLike<{ data: unknown; error: { message?: string; code?: string } | null }> };
const record = (v: unknown): v is Record<string, any> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const closed = (v: Record<string, any>) => v.contract_version === VARIANT_DRAFT_CONTRACT && v.draft_only === true
  && v.can_publish === false && v.can_index === false && v.can_enable_checkout === false;
export class VariantStorageError extends Error {
  status: number; outcome: 'not_written' | 'unknown';
  constructor(code: string, status: number, outcome: 'not_written' | 'unknown' = 'not_written') { super(code); this.status = status; this.outcome = outcome; }
}
function rpcError(error: { message?: string; code?: string }): never {
  const message = error.message || '';
  if (error.code === 'P0001' && /^variant_[a-z_]+$/.test(message)) {
    const status = /conflict/.test(message) ? 409 : /not_found/.test(message) ? 404 : /contract_not_ready/.test(message) ? 503 : 422;
    throw new VariantStorageError(message, status);
  }
  if (['23503', '23505', '23514', '42501'].includes(error.code || '')) throw new VariantStorageError('variant_database_constraint_rejected', 409);
  throw new VariantStorageError('variant_storage_outcome_unknown', 503, 'unknown');
}
export async function verifyVariantDraftBoundary(client: VariantRPCClient): Promise<void> {
  const { data, error } = await client.rpc('feya_commerce_variant_draft_health_v1');
  if (error || !record(data) || !closed(data) || data.ready !== true) throw new VariantStorageError('variant_contract_not_ready', 503);
}
export async function readVariantDraft(client: VariantRPCClient, productId: string) {
  await verifyVariantDraftBoundary(client);
  const { data, error } = await client.rpc('feya_commerce_read_variant_draft_v1', { p_product_id: productId });
  if (error) rpcError(error);
  if (!record(data) || !closed(data) || data.canonical_product_id !== productId || !Number.isSafeInteger(data.current_revision)
    || data.current_revision < 0 || !matchesVariantShape(data.source_bindings, VARIANT_DRAFT_SCHEMA.properties!.source_bindings)
    || !Array.isArray(data.configuration_context) || data.configuration_context.length > 128)
    throw new VariantStorageError('variant_reader_contract_invalid', 503);
  if (data.current_revision === 0) {
    if (data.snapshot !== null || data.snapshot_sha256 !== null) throw new VariantStorageError('variant_reader_contract_invalid', 503);
  } else {
    if (!matchesVariantShape(data.snapshot, VARIANT_DRAFT_SCHEMA.properties!.snapshot)) throw new VariantStorageError('variant_reader_contract_invalid', 503);
    try { validateVariantSnapshot(data.snapshot); } catch { throw new VariantStorageError('variant_reader_contract_invalid', 503); }
    if (data.snapshot.canonical_product_id !== productId || data.snapshot.product_revision !== data.current_revision
      || typeof data.snapshot_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(data.snapshot_sha256)) throw new VariantStorageError('variant_reader_contract_invalid', 503);
  }
  return data;
}
export async function saveVariantDraft(client: VariantRPCClient, actorId: string, input: VariantDraftInput) {
  await verifyVariantDraftBoundary(client);
  let result;
  try { result = await client.rpc('feya_commerce_save_variant_draft_v1', { p_actor_user_id: actorId, p_payload: input }); }
  catch { throw new VariantStorageError('variant_storage_outcome_unknown', 503, 'unknown'); }
  if (result.error) rpcError(result.error);
  const data = result.data, uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  if (!record(data) || !closed(data) || data.request_id !== input.request_id
    || data.canonical_product_id !== input.snapshot.canonical_product_id || data.product_revision !== input.snapshot.product_revision
    || typeof data.snapshot_sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(data.snapshot_sha256)
    || typeof data.execution_request_id !== 'string' || !uuid.test(data.execution_request_id)
    || typeof data.change_event_id !== 'string' || !uuid.test(data.change_event_id) || typeof data.replayed !== 'boolean')
    throw new VariantStorageError('variant_receipt_unverified_retry_same_request', 503, 'unknown');
  return data;
}
