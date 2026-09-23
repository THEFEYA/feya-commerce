import { createHash } from 'node:crypto';

export const SEO_DRAFT_SAVE_RPC = 'feya_commerce_save_seo_review_draft_v1';
export const SEO_DRAFT_SAVE_HEALTH_RPC = 'feya_commerce_seo_draft_save_contract_v1';
export const SEO_DRAFT_SAVE_CONTRACT = 'atomic_review_save_v1';

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** Whole server-built JSON payload: identical retries deduplicate; changed evidence is a new revision. */
export function seoDraftRequestKey(payload: unknown, clientKey?: string | null): string {
  const jsonPayload = JSON.parse(JSON.stringify(payload));
  if (clientKey != null && (!/^[A-Za-z0-9._:-]{8,200}$/.test(clientKey))) {
    throw new Error('Idempotency-Key must contain 8-200 letters, digits, dots, underscores, colons or hyphens.');
  }
  const material = clientKey == null
    ? `seo-review-content-v1:${canonicalJson(jsonPayload)}`
    : `seo-review-client-v1:${jsonPayload.canonical_product_id}:${clientKey}`;
  return createHash('sha256').update(material).digest('hex');
}

type RpcClient = { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: any; error: any }> };

/** One RPC transaction. Never fall back to separate inserts if migration is missing. */
export async function insertSeoDraftWithEvent(client: RpcClient, payload: unknown, clientKey?: string | null) {
  let requestKey: string;
  try { requestKey = seoDraftRequestKey(payload, clientKey); }
  catch (error) { return { ok: false, httpStatus: 400, error: (error as Error).message, draft: null, event: null }; }
  const { data, error } = await client.rpc(SEO_DRAFT_SAVE_RPC, { p_request_key: requestKey, p_payload: payload });
  if (error || !data?.draft?.id || !data?.event?.id || data.event.draft_id !== data.draft.id) {
    return { ok: false, httpStatus: error?.code === '23505' ? 409 : 500, error: error?.message || 'Atomic save returned an invalid receipt.', draft: null, event: null };
  }
  return { ok: true, httpStatus: data.replayed ? 200 : 201, draft: data.draft, event: data.event, replayed: data.replayed === true };
}
