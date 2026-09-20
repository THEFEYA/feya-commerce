import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Input = {
  attention_id?: string;
  expected_status?: string;
  new_status?: string;
  decision_code?: string | null;
  reason?: string | null;
  resolution_json?: Record<string, unknown> | null;
  idempotency_key?: string | null;
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

  const attentionId = cleanText(input.attention_id);
  const expectedStatus = cleanText(input.expected_status).toUpperCase();
  const newStatus = cleanText(input.new_status).toUpperCase();
  const decisionCode = cleanText(input.decision_code) || null;
  const reason = cleanText(input.reason) || null;
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();
  const resolutionJson =
    input.resolution_json && typeof input.resolution_json === 'object' && !Array.isArray(input.resolution_json)
      ? input.resolution_json
      : {};

  if (!isUuid(attentionId)) {
    return NextResponse.json({ ok: false, code: 'invalid_attention_id', error: 'Invalid attention_id.' }, { status: 400 });
  }

  if (!['OPEN', 'ACKNOWLEDGED'].includes(expectedStatus)) {
    return NextResponse.json({ ok: false, code: 'invalid_expected_status', error: 'Unsupported expected status.' }, { status: 400 });
  }

  if (!['ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'].includes(newStatus)) {
    return NextResponse.json({ ok: false, code: 'invalid_new_status', error: 'Unsupported owner-attention transition.' }, { status: 400 });
  }

  if (newStatus === 'RESOLVED' && !decisionCode) {
    return NextResponse.json({ ok: false, code: 'decision_required', error: 'A decision code is required to resolve Owner Attention.' }, { status: 400 });
  }

  if (['RESOLVED', 'CANCELLED'].includes(newStatus) && (!reason || reason.length < 3)) {
    return NextResponse.json({ ok: false, code: 'reason_required', error: 'Add a short reason for a terminal decision.' }, { status: 400 });
  }

  if (reason && reason.length > 1200) {
    return NextResponse.json({ ok: false, code: 'reason_too_long', error: 'Decision reason is too long.' }, { status: 400 });
  }

  const { data: current, error: currentError } = await actor.service
    .from('feya_commerce_v_owner_attention_safe_v3')
    .select('attention_id,attention_status,title,attention_type,required_action')
    .eq('attention_id', attentionId)
    .maybeSingle();

  if (currentError) {
    return NextResponse.json({ ok: false, code: 'attention_read_failed', error: currentError.message }, { status: 500 });
  }

  if (!current) {
    return NextResponse.json({ ok: false, code: 'attention_not_found', error: 'Owner Attention item not found.' }, { status: 404 });
  }

  if (String(current.attention_status || '').toUpperCase() !== expectedStatus) {
    return NextResponse.json(
      {
        ok: false,
        code: 'stale_attention_state',
        error: 'The decision changed since this screen was opened. Refresh before deciding.',
        current_status: current.attention_status,
      },
      { status: 409 },
    );
  }

  const { data, error } = await actor.service.rpc('feya_fn_transition_owner_attention_v1', {
    p_attention_id: attentionId,
    p_expected_status: expectedStatus,
    p_new_status: newStatus,
    p_human_user_id: actor.userId,
    p_decision_code: decisionCode,
    p_reason: reason,
    p_resolution_json: {
      ...resolutionJson,
      source: 'OWNER_UI',
      attention_type: current.attention_type,
    },
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const stale = error.message?.includes('stale_owner_attention_status');
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_attention_state' : 'owner_attention_transition_failed', error: error.message },
      { status: stale ? 409 : 500 },
    );
  }

  return NextResponse.json(
    {
      ok: true,
      decision: Array.isArray(data) ? data[0] : data,
      message: newStatus === 'ACKNOWLEDGED'
        ? 'Решение отмечено как принятое к рассмотрению.'
        : 'Решение владельца записано. Само бизнес-действие этим не выполнялось.',
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
