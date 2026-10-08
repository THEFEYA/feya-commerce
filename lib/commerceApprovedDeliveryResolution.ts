import { createHash } from 'node:crypto';
import { parseDeliveryApprovalState, type DeliveryApprovalState } from './commerceDeliveryApprovalStorage.ts';
import { parseDeliveryCatalog, parseDeliveryWorkspaceState, type DeliveryWorkspaceState } from './commerceDeliveryWorkspaceStorage.ts';
import { DELIVERY_COUNTRIES, previewDeliveryDraft, type DeliveryCatalogProduct, type DeliveryDraftPreview } from './commerceDeliveryWorkspace.ts';
import type { QuoteRPCClient } from './commerceQuoteStorage.ts';

export const APPROVED_DELIVERY_CONTEXT = 'commerce_approved_delivery_context_v1';
export const APPROVED_DELIVERY_RESOLUTION = 'commerce_approved_delivery_resolution_v1';
export const APPROVED_DELIVERY_CONTEXT_RPC = 'feya_commerce_approved_delivery_context_v1';
export type ApprovedDeliveryRequest = {
  contract_version: typeof APPROVED_DELIVERY_RESOLUTION;
  quote_receipt_ids: string[]; country: string; postal_code: string; shipping_method: 'standard' | 'express';
};
export type DeliveryMerchandiseLine = {
  quote_receipt_id: string; canonical_product_id: string; configuration_price_id: string; variant_id: string;
  color_id: string | null; size_id: string | null; quantity: number;
  unit_amount_minor: number; line_amount_minor: number; currency: string;
  offer_revision_id: string; price_quote_id: string; price_revision: number; release_ref: string;
};
export type ApprovedDeliveryContext = {
  approval: DeliveryApprovalState; approved_workspace: DeliveryWorkspaceState;
  catalog: DeliveryCatalogProduct[]; catalog_sha256: string; merchandise: DeliveryMerchandiseLine[]; calculated_at: string;
};
export type ApprovedDeliveryResolution = {
  contract_version: typeof APPROVED_DELIVERY_RESOLUTION;
  approval_id: string; approval_revision: number; workspace_version_id: string; workspace_revision: number;
  snapshot_sha256: string; catalog_sha256: string; basket_sha256: string; destination_sha256: string;
  quote_receipt_ids: string[]; country: string; postal_code: string; shipping_method: 'standard' | 'express';
  currency: string; shipping_amount_minor: number; parcel_count: number; parcels: DeliveryDraftPreview['parcels'];
  estimated_arrival: DeliveryDraftPreview['estimated_arrival']; scheduling_time_zone: string; calculated_at: string;
  start_basis: 'preview_ready_now'; persisted: false; payable: false;
  public_rates_enabled: false; payment_enabled: false; provider_session_enabled: false;
};
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const hash = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
const digest = (v: unknown) => createHash('sha256').update(JSON.stringify(v)).digest('hex');
export class ApprovedDeliveryResolutionError extends Error {
  status: number;
  constructor(code: string, status = 503) { super(code); this.status = status; }
}
function fail(code: string, status = 503): never { throw new ApprovedDeliveryResolutionError(code, status); }

/** Public-shaped input contains identities and destination choices only. No amount, quantity, date or readiness claim. */
export function parseApprovedDeliveryRequest(raw: unknown): ApprovedDeliveryRequest {
  if (!record(raw) || Object.keys(raw).sort().join(',') !== 'contract_version,country,postal_code,quote_receipt_ids,shipping_method'
    || raw.contract_version !== APPROVED_DELIVERY_RESOLUTION || !Array.isArray(raw.quote_receipt_ids)
    || raw.quote_receipt_ids.length < 1 || raw.quote_receipt_ids.length > 20 || raw.quote_receipt_ids.some(v => !uuid(v))
    || new Set(raw.quote_receipt_ids).size !== raw.quote_receipt_ids.length
    || typeof raw.country !== 'string' || !DELIVERY_COUNTRIES.includes(raw.country)
    || typeof raw.postal_code !== 'string' || raw.postal_code.length > 32 || !/^[A-Za-z0-9 -]*$/.test(raw.postal_code)
    || !['standard', 'express'].includes(String(raw.shipping_method))) fail('approved_delivery_request_invalid', 400);
  return { contract_version: APPROVED_DELIVERY_RESOLUTION, quote_receipt_ids: [...raw.quote_receipt_ids].sort(),
    country: raw.country, postal_code: raw.postal_code.toUpperCase().replace(/[ -]/g, ''), shipping_method: raw.shipping_method as ApprovedDeliveryRequest['shipping_method'] };
}

function parseContext(raw: unknown, request: ApprovedDeliveryRequest): ApprovedDeliveryContext {
  if (!record(raw) || raw.contract_version !== APPROVED_DELIVERY_CONTEXT || raw.public_rates_enabled !== false
    || raw.payment_enabled !== false || raw.provider_session_enabled !== false || !hash(raw.catalog_sha256)
    || typeof raw.calculated_at !== 'string' || !Number.isFinite(Date.parse(raw.calculated_at))) fail('approved_delivery_context_invalid');
  let approval: DeliveryApprovalState, workspace: DeliveryWorkspaceState, catalog: DeliveryCatalogProduct[];
  try { approval = parseDeliveryApprovalState(raw.approval); workspace = parseDeliveryWorkspaceState(raw.approved_workspace); catalog = parseDeliveryCatalog(raw.catalog); }
  catch { fail('approved_delivery_context_invalid'); }
  if (!approval.approval_id) fail('approved_delivery_approval_required', 409);
  if (!workspace.draft || approval.workspace_version_id !== workspace.version_id || approval.workspace_revision !== workspace.revision
    || approval.snapshot_sha256 !== workspace.snapshot_sha256 || approval.catalog_sha256 !== raw.catalog_sha256) fail('approved_delivery_authority_mismatch', 409);
  if (!Array.isArray(raw.merchandise) || raw.merchandise.length !== request.quote_receipt_ids.length) fail('approved_delivery_context_invalid');
  const lines = raw.merchandise;
  for (const line of lines) {
    if (!record(line) || ['quote_receipt_id','canonical_product_id','configuration_price_id','variant_id','offer_revision_id','price_quote_id'].some(k => !uuid(line[k]))
      || [line.color_id,line.size_id].some(v => v !== null && !uuid(v))
      || !Number.isSafeInteger(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 1000
      || !Number.isSafeInteger(line.unit_amount_minor) || Number(line.unit_amount_minor) < 1
      || !Number.isSafeInteger(line.line_amount_minor) || Number(line.line_amount_minor) !== Number(line.unit_amount_minor) * Number(line.quantity)
      || !Number.isSafeInteger(line.price_revision) || Number(line.price_revision) < 1
      || typeof line.currency !== 'string' || !/^[A-Z]{3}$/.test(line.currency)
      || typeof line.release_ref !== 'string' || !line.release_ref.trim()) fail('approved_delivery_context_invalid');
  }
  const merchandise = lines as DeliveryMerchandiseLine[];
  if (merchandise.map(l => l.quote_receipt_id).sort().join(',') !== request.quote_receipt_ids.join(',')
    || new Set(merchandise.map(l => l.currency)).size !== 1 || new Set(merchandise.map(l => l.release_ref)).size !== 1) fail('approved_delivery_context_invalid');
  // Native PostgreSQL JSON carries microseconds; the calendar contract uses ISO
  // milliseconds. Normalize the database instant, never substitute browser/server now.
  return { approval, approved_workspace: workspace, catalog, catalog_sha256: raw.catalog_sha256, merchandise,
    calculated_at: new Date(raw.calculated_at).toISOString() };
}

/** One RPC reads the exact approved snapshot and current merchandise under one database snapshot. Never use the editable draft head. */
export async function resolveApprovedDelivery(client: QuoteRPCClient, rawRequest: unknown): Promise<ApprovedDeliveryResolution> {
  const request = parseApprovedDeliveryRequest(rawRequest);
  let result;
  try { result = await client.rpc(APPROVED_DELIVERY_CONTEXT_RPC, { p_quote_receipt_ids: request.quote_receipt_ids }); }
  catch { fail('approved_delivery_storage_unavailable'); }
  if (result.error) {
    const code = result.error.message || '';
    if (result.error.code === 'P0001' && /^approved_delivery_[a-z_]+$/.test(code)) fail(code, /boundary/.test(code) ? 503 : /request_invalid/.test(code) ? 400 : 409);
    fail('approved_delivery_storage_unavailable');
  }
  const c = parseContext(result.data, request), quantities = new Map<string, { canonical_product_id: string; configuration_price_id: string; quantity: number; specifications_ready: false }>();
  // Two colors/sizes of the same configuration still share parcel and production capacity.
  for (const line of c.merchandise) {
    const key = `${line.canonical_product_id}:${line.configuration_price_id}`, existing = quantities.get(key);
    if (existing) existing.quantity += line.quantity;
    else quantities.set(key, { canonical_product_id: line.canonical_product_id, configuration_price_id: line.configuration_price_id, quantity: line.quantity, specifications_ready: false });
  }
  let preview: DeliveryDraftPreview;
  try { preview = previewDeliveryDraft(c.approved_workspace.draft, { lines: [...quantities.values()], country: request.country,
    postal_code: request.postal_code, shipping_method: request.shipping_method }, c.catalog, c.approval.workspace_version_id!, c.calculated_at); }
  catch (error) {
    const code = error instanceof Error ? error.message : '';
    fail(/^delivery_[a-z_]+$/.test(code) ? code : 'approved_delivery_calculation_failed', 422);
  }
  if (preview.currency !== c.merchandise[0].currency) fail('approved_delivery_currency_mismatch', 409);
  const basket = [...c.merchandise].sort((a, b) => a.quote_receipt_id.localeCompare(b.quote_receipt_id)).map(l => ({
    quote_receipt_id: l.quote_receipt_id, canonical_product_id: l.canonical_product_id, configuration_price_id: l.configuration_price_id,
    variant_id: l.variant_id, color_id: l.color_id, size_id: l.size_id, quantity: l.quantity,
    unit_amount_minor: l.unit_amount_minor, line_amount_minor: l.line_amount_minor, currency: l.currency,
    offer_revision_id: l.offer_revision_id, price_quote_id: l.price_quote_id, price_revision: l.price_revision, release_ref: l.release_ref,
  }));
  return { contract_version: APPROVED_DELIVERY_RESOLUTION, approval_id: c.approval.approval_id!, approval_revision: c.approval.revision,
    workspace_version_id: c.approval.workspace_version_id!, workspace_revision: c.approval.workspace_revision!,
    snapshot_sha256: c.approval.snapshot_sha256!, catalog_sha256: c.catalog_sha256,
    basket_sha256: digest(basket), destination_sha256: digest({ country: request.country, postal_code: request.postal_code }),
    quote_receipt_ids: request.quote_receipt_ids, country: request.country, postal_code: request.postal_code, shipping_method: request.shipping_method,
    currency: preview.currency, shipping_amount_minor: preview.shipping_amount_minor, parcel_count: preview.parcel_count, parcels: preview.parcels,
    estimated_arrival: preview.estimated_arrival, scheduling_time_zone: preview.scheduling_time_zone, calculated_at: c.calculated_at,
    start_basis: 'preview_ready_now', persisted: false, payable: false, public_rates_enabled: false, payment_enabled: false, provider_session_enabled: false };
}
