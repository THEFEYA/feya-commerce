import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  cleanup_id?: number | string;
  expected_review_status?: string;
  decision?: string;
  approved_keyword?: string | null;
  reason?: string;
  idempotency_key?: string;
};

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
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

  const cleanupId = Number(input.cleanup_id);
  const expectedStatus = cleanText(input.expected_review_status).toLowerCase();
  const decision = cleanText(input.decision).toLowerCase();
  const approvedKeyword = cleanText(input.approved_keyword) || null;
  const reason = cleanText(input.reason);
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!Number.isInteger(cleanupId) || cleanupId <= 0) {
    return NextResponse.json({ ok: false, code: 'invalid_cleanup_id', error: 'Invalid cleanup_id.' }, { status: 400 });
  }

  if (!['pending', 'needs_review'].includes(expectedStatus)) {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Keyword is not in a reviewable state.' }, { status: 400 });
  }

  if (!['approved', 'rejected', 'needs_review'].includes(decision)) {
    return NextResponse.json({ ok: false, code: 'invalid_decision', error: 'Unsupported keyword review decision.' }, { status: 400 });
  }

  if (decision === 'approved' && !approvedKeyword) {
    return NextResponse.json({ ok: false, code: 'approved_keyword_required', error: 'Approved keyword is required.' }, { status: 400 });
  }

  if (approvedKeyword && approvedKeyword.length > 240) {
    return NextResponse.json({ ok: false, code: 'keyword_too_long', error: 'Approved keyword is too long.' }, { status: 400 });
  }

  if (reason.length < 3) {
    return NextResponse.json({ ok: false, code: 'reason_required', error: 'Add a short review reason.' }, { status: 400 });
  }

  if (reason.length > 1500) {
    return NextResponse.json({ ok: false, code: 'reason_too_long', error: 'Review reason is too long.' }, { status: 400 });
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_review_keyword_cleanup_v1', {
    p_cleanup_id: cleanupId,
    p_expected_review_status: expectedStatus,
    p_decision: decision,
    p_approved_keyword: approvedKeyword,
    p_reason: reason,
    p_human_user_id: actor.userId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Keyword review failed.';
    const stale = /stale|cannot be reviewed/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_keyword_state' : 'keyword_review_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      review: Array.isArray(data) ? data[0] : data,
      message:
        decision === 'approved'
          ? 'Ключевой запрос одобрен человеком.'
          : decision === 'rejected'
            ? 'Ключевой запрос отклонён человеком.'
            : 'Ключевой запрос оставлен на дополнительной проверке.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
