import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  draft_id?: string;
  expected_review_status?: string;
  decision?: string;
  note?: string;
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

  const draftId = cleanText(input.draft_id);
  const expectedStatus = cleanText(input.expected_review_status).toLowerCase();
  const decision = cleanText(input.decision).toLowerCase();
  const note = cleanText(input.note);
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!isUuid(draftId)) {
    return NextResponse.json({ ok: false, code: 'invalid_draft_id', error: 'Invalid draft_id.' }, { status: 400 });
  }

  if (!['not_reviewed', 'changes_requested'].includes(expectedStatus)) {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Draft is not in a reviewable Human status.' }, { status: 400 });
  }

  if (!['approved', 'changes_requested', 'rejected'].includes(decision)) {
    return NextResponse.json({ ok: false, code: 'invalid_decision', error: 'Unsupported Human draft decision.' }, { status: 400 });
  }

  if (note.length < 3) {
    return NextResponse.json({ ok: false, code: 'note_required', error: 'Add a short Human review note.' }, { status: 400 });
  }

  if (note.length > 2000) {
    return NextResponse.json({ ok: false, code: 'note_too_long', error: 'Review note is too long.' }, { status: 400 });
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_review_sco_shadow_draft_v1', {
    p_draft_id: draftId,
    p_expected_review_status: expectedStatus,
    p_decision: decision,
    p_note: note,
    p_human_user_id: actor.userId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Human draft review failed.';
    const stale = /stale|cannot approve|cannot transition|cannot be reviewed/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_or_blocked_draft' : 'draft_review_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      review: Array.isArray(data) ? data[0] : data,
      message:
        decision === 'approved'
          ? 'Черновик одобрен человеком. Публикация этим не выполнена.'
          : decision === 'changes_requested'
            ? 'Запрошены изменения черновика.'
            : 'Черновик отклонён человеком.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
