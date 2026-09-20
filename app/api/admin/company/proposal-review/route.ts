import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ProposalKind = 'QUERY_CLUSTER' | 'PAGE_OWNERSHIP' | 'INDEXABILITY';

type Input = {
  proposal_kind?: ProposalKind | string;
  proposal_id?: string;
  expected_status?: string;
  decision?: string;
  review_note?: string;
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
  const decision = cleanText(input.decision).toUpperCase();
  const reviewNote = cleanText(input.review_note);
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!['QUERY_CLUSTER', 'PAGE_OWNERSHIP', 'INDEXABILITY'].includes(proposalKind)) {
    return NextResponse.json({ ok: false, code: 'invalid_proposal_kind', error: 'Unsupported proposal kind.' }, { status: 400 });
  }

  if (!isUuid(proposalId)) {
    return NextResponse.json({ ok: false, code: 'invalid_proposal_id', error: 'Invalid proposal_id.' }, { status: 400 });
  }

  if (!['DRAFT', 'REVIEW'].includes(expectedStatus)) {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Unsupported expected proposal status.' }, { status: 400 });
  }

  if (!['APPROVED', 'REJECTED'].includes(decision)) {
    return NextResponse.json({ ok: false, code: 'invalid_decision', error: 'Decision must be APPROVED or REJECTED.' }, { status: 400 });
  }

  if (reviewNote.length < 3) {
    return NextResponse.json({ ok: false, code: 'review_note_required', error: 'Add a short review note.' }, { status: 400 });
  }

  if (reviewNote.length > 1500) {
    return NextResponse.json({ ok: false, code: 'review_note_too_long', error: 'Review note is too long.' }, { status: 400 });
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_review_seo_proposal_v1', {
    p_proposal_kind: proposalKind,
    p_proposal_id: proposalId,
    p_expected_status: expectedStatus,
    p_decision: decision,
    p_review_note: reviewNote,
    p_human_user_id: actor.userId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Proposal review failed.';
    const stale = /stale|cannot be reviewed/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_proposal_state' : 'proposal_review_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      review: Array.isArray(data) ? data[0] : data,
      message: decision === 'APPROVED'
        ? 'Предложение одобрено. Каноническое применение остаётся отдельным действием.'
        : 'Предложение отклонено и не будет применено автоматически.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
