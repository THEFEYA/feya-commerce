import { NextRequest, NextResponse } from 'next/server';
import { requireVariantDraftActor } from '@/lib/commerceVariantDraftServer';
import { parseVariantDraftInput } from '@/lib/commerceVariantDraftSchema';
import { readVariantDraft, saveVariantDraft, VariantStorageError } from '@/lib/commerceVariantDraftStorage';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ productId: string }> };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex, nofollow' } });
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin'), host = request.headers.get('host');
  if (!origin || !host) return false;
  try {
    const url = new URL(origin);
    // NextURL normalizes 127.0.0.1 to localhost. Use the actual HTTP Host, not that rewritten hostname.
    // Do not accept arbitrary X-Forwarded-Host or wildcard origin overrides.
    return url.origin === origin && url.host === host && url.protocol === request.nextUrl.protocol;
  } catch { return false; }
}
function failure(error: unknown) {
  if (error instanceof VariantStorageError) return reply({ ok: false, code: error.message, write_outcome: error.outcome,
    retry_same_request: error.outcome === 'unknown', can_publish: false, can_index: false }, error.status);
  return reply({ ok: false, code: 'variant_request_failed', write_outcome: 'unknown', retry_same_request: true }, 503);
}
async function limitedJson(request: NextRequest) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) throw new VariantStorageError('variant_json_required', 415);
  const reader = request.body?.getReader();
  if (!reader) throw new VariantStorageError('variant_json_required', 400);
  const chunks: Uint8Array[] = []; let length = 0;
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    length += value.length;
    if (length > 1_000_000) { await reader.cancel(); throw new VariantStorageError('variant_payload_too_large', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(length); let offset = 0;
  for (const c of chunks) { bytes.set(c, offset); offset += c.length; }
  try { return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new VariantStorageError('variant_json_invalid', 400); }
}
export async function GET(_request: NextRequest, context: Context) {
  try {
    const actor = await requireVariantDraftActor(); if (!actor.ok) return reply({ ok: false, code: actor.code }, actor.status);
    const { productId } = await context.params; if (!uuid.test(productId)) return reply({ ok: false, code: 'variant_product_id_invalid' }, 400);
    return reply({ ok: true, ...await readVariantDraft(actor.client, productId), editor_actor_id: actor.actorId });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const actor = await requireVariantDraftActor(); if (!actor.ok) return reply({ ok: false, code: actor.code, write_outcome: 'not_written' }, actor.status);
    const expectedActor = request.headers.get('x-feya-editor-actor');
    if (expectedActor && expectedActor !== actor.actorId) return reply({ ok: false, code: 'variant_editor_actor_changed', write_outcome: 'not_written' }, 409);
    if (!sameOrigin(request)) return reply({ ok: false, code: 'variant_same_origin_required', write_outcome: 'not_written' }, 403);
    const { productId } = await context.params; if (!uuid.test(productId)) return reply({ ok: false, code: 'variant_product_id_invalid' }, 400);
    const body = await limitedJson(request);
    let input;
    try { input = parseVariantDraftInput(body, productId); }
    catch { throw new VariantStorageError('variant_draft_shape_or_scope_invalid', 422); }
    const result = await saveVariantDraft(actor.client, actor.actorId, input);
    return reply({ ok: true, ...result }, result.replayed ? 200 : 201);
  } catch (error) { return failure(error); }
}
