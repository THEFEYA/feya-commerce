import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  execution_request_id?: string;
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

  const executionRequestId = cleanText(input.execution_request_id);
  const expectedStatus = cleanText(input.expected_status).toUpperCase();
  const reason = cleanText(input.reason);
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!isUuid(executionRequestId)) {
    return NextResponse.json({ ok: false, code: 'invalid_execution_request_id', error: 'Invalid execution_request_id.' }, { status: 400 });
  }

  if (expectedStatus !== 'APPROVAL_REQUIRED') {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Execution request is not in APPROVAL_REQUIRED state.' }, { status: 400 });
  }

  if (reason.length < 3) {
    return NextResponse.json({ ok: false, code: 'reason_required', error: 'Add a short approval reason.' }, { status: 400 });
  }

  if (reason.length > 1500) {
    return NextResponse.json({ ok: false, code: 'reason_too_long', error: 'Approval reason is too long.' }, { status: 400 });
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_approve_execution_request_v1', {
    p_execution_request_id: executionRequestId,
    p_expected_status: expectedStatus,
    p_reason: reason,
    p_human_user_id: actor.userId,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Execution approval failed.';
    const stale = /stale|does not require approval/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_execution_state' : 'execution_approval_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      approval: Array.isArray(data) ? data[0] : data,
      message: 'Запрос выполнения одобрен. Это ещё не выполнение: dispatcher и execution receipt остаются отдельными этапами.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
