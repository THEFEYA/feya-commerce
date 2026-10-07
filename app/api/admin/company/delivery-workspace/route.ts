import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { readDeliveryCatalog, readDeliveryWorkspace, saveDeliveryWorkspace, DeliveryWorkspaceStorageError } from '@/lib/commerceDeliveryWorkspaceStorage';
import { previewDeliveryDraft } from '@/lib/commerceDeliveryWorkspace';

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow, noarchive' } });
function failure(error: unknown) {
  if (error instanceof DeliveryWorkspaceStorageError) return reply({ ok: false, code: error.message }, error.status);
  if (error instanceof Error && /^delivery_[a-z_]+$/.test(error.message)) return reply({ ok: false, code: error.message }, 422);
  return reply({ ok: false, code: 'delivery_workspace_unavailable' }, 503);
}
function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin'), host = request.headers.get('host');
  if (!origin || !host) return false;
  try { const url = new URL(origin); return url.origin === origin && url.host === host && url.protocol === request.nextUrl.protocol; } catch { return false; }
}
async function bodyJSON(request: NextRequest) {
  const reader = request.body?.getReader();
  if (!reader) throw new DeliveryWorkspaceStorageError('delivery_workspace_request_invalid', 400);
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 540000) { await reader.cancel(); throw new DeliveryWorkspaceStorageError('delivery_workspace_request_too_large', 413); }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as unknown;
  } catch (error) {
    if (error instanceof DeliveryWorkspaceStorageError) throw error;
    throw new DeliveryWorkspaceStorageError('delivery_workspace_request_invalid', 400);
  } finally { reader.releaseLock(); }
}
export async function GET() {
  const actor = await requireOwnerActionActor('delivery_workspace_draft');
  if (!actor.ok) return reply({ ok: false, code: actor.code }, actor.status);
  try {
    const [workspace, catalog] = await Promise.all([readDeliveryWorkspace(actor.service), readDeliveryCatalog(actor.service)]);
    return reply({ ok: true, workspace, catalog });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  const actor = await requireOwnerActionActor('delivery_workspace_draft');
  if (!actor.ok) return reply({ ok: false, code: actor.code }, actor.status);
  if (!sameOrigin(request)) return reply({ ok: false, code: 'delivery_same_origin_required' }, 403);
  try {
    const body = await bodyJSON(request);
    if (!body || typeof body !== 'object' || Array.isArray(body)) return reply({ ok: false, code: 'delivery_workspace_request_invalid' }, 400);
    const input = body as Record<string, unknown>;
    if (input.action === 'save') {
      const catalog = await readDeliveryCatalog(actor.service);
      const receipt = await saveDeliveryWorkspace(actor.service, body, actor.userId, catalog);
      return reply({ ok: true, receipt });
    }
    if (input.action === 'preview') {
      if (Object.keys(input).sort().join(',') !== 'action,expected_revision,request' || !Number.isSafeInteger(input.expected_revision)) return reply({ ok: false, code: 'delivery_workspace_request_invalid' }, 400);
      const [workspace, catalog] = await Promise.all([readDeliveryWorkspace(actor.service), readDeliveryCatalog(actor.service)]);
      if (input.expected_revision !== workspace.revision) return reply({ ok: false, code: 'delivery_workspace_revision_conflict' }, 409);
      if (!workspace.draft || !workspace.version_id) return reply({ ok: false, code: 'delivery_draft_save_required' }, 409);
      return reply({ ok: true, preview: previewDeliveryDraft(workspace.draft, input.request, catalog, workspace.version_id, new Date().toISOString()) });
    }
    return reply({ ok: false, code: 'delivery_workspace_action_invalid' }, 400);
  } catch (error) { return failure(error); }
}
