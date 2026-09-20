import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  proposal_kind?: 'PAGE_OWNERSHIP' | 'INDEXABILITY' | string;
  proposal_id?: string;
  expected_status?: string;
  reason?: string;
  idempotency_key?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const actor = await requireOwnerActionActor();
  if (!actor.ok) {
    return NextResponse.json(
      { ok: false, code: actor.code, error: actor.error },
      { status: actor.status, headers: { 'Cache-Control': 'private, no-store' } },
    );
  }

  let input: Input;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, code: 'invalid_json', error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const proposalKind = cleanText(input.proposal_kind).toUpperCase();
  const proposalId = cleanText(input.proposal_id);
  const expectedStatus = cleanText(input.expected_status).toUpperCase();
  const reason = cleanText(input.reason);
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!['PAGE_OWNERSHIP', 'INDEXABILITY'].includes(proposalKind)) {
    return NextResponse.json({ ok: false, code: 'invalid_proposal_kind', error: 'Unsupported proposal apply kind.' }, { status: 400 });
  }

  if (!isUuid(proposalId)) {
    return NextResponse.json({ ok: false, code: 'invalid_proposal_id', error: 'Invalid proposal_id.' }, { status: 400 });
  }

  if (expectedStatus !== 'APPROVED') {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Only APPROVED proposals can be applied.' }, { status: 400 });
  }

  if (reason.length < 3) {
    return NextResponse.json({ ok: false, code: 'reason_required', error: 'Add a short apply reason.' }, { status: 400 });
  }

  if (reason.length > 1500) {
    return NextResponse.json({ ok: false, code: 'reason_too_long', error: 'Apply reason is too long.' }, { status: 400 });
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_apply_seo_proposal_v1', {
    p_proposal_kind: proposalKind,
    p_proposal_id: proposalId,
    p_expected_status: expectedStatus,
    p_reason: reason,
    p_human_user_id: actor.userId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Proposal apply failed.';
    const stale = /stale|only approved|no longer|cannot|missing/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_apply_state' : 'proposal_apply_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      apply: Array.isArray(data) ? data[0] : data,
      message: proposalKind === 'PAGE_OWNERSHIP'
        ? 'Каноническая ответственность страницы записана. Индексация этим не менялась.'
        : 'Решение по индексации применено к SEO Page Portfolio. Публикация контента этим не выполнялась.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
