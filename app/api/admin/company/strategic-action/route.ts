import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StrategicAction =
  | 'ACTIVATE_GROWTH_OBJECTIVE'
  | 'HUMAN_APPROVE_INITIATIVE'
  | 'ACTIVATE_GROWTH_STRATEGY';

type Input = {
  action_code?: StrategicAction | string;
  entity_id?: string;
  expected_state?: string;
  decision?: string;
  reason?: string;
  expected_active_version?: number | null;
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

  const actionCode = cleanText(input.action_code).toUpperCase();
  const entityId = cleanText(input.entity_id);
  const expectedState = cleanText(input.expected_state).toUpperCase();
  const decision = cleanText(input.decision).toUpperCase();
  const reason = cleanText(input.reason);
  const expectedActiveVersion = Number.isFinite(Number(input.expected_active_version))
    ? Number(input.expected_active_version)
    : 0;
  const idempotencyKey = cleanText(input.idempotency_key) || crypto.randomUUID();

  if (!['ACTIVATE_GROWTH_OBJECTIVE', 'HUMAN_APPROVE_INITIATIVE', 'ACTIVATE_GROWTH_STRATEGY'].includes(actionCode)) {
    return NextResponse.json({ ok: false, code: 'invalid_action', error: 'Unsupported strategic owner action.' }, { status: 400 });
  }

  if (!isUuid(entityId)) {
    return NextResponse.json({ ok: false, code: 'invalid_entity_id', error: 'Invalid entity_id.' }, { status: 400 });
  }

  if (reason.length < 3) {
    return NextResponse.json({ ok: false, code: 'reason_required', error: 'Add a short reason for the strategic decision.' }, { status: 400 });
  }

  if (reason.length > 1500) {
    return NextResponse.json({ ok: false, code: 'reason_too_long', error: 'Decision reason is too long.' }, { status: 400 });
  }

  if (actionCode === 'ACTIVATE_GROWTH_OBJECTIVE') {
    if (!['DRAFT', 'FEASIBILITY_REVIEW', 'PAUSED'].includes(expectedState) || decision !== 'ACTIVATE') {
      return NextResponse.json({ ok: false, code: 'invalid_objective_transition', error: 'Objective activation state is invalid.' }, { status: 400 });
    }
  }

  if (actionCode === 'HUMAN_APPROVE_INITIATIVE') {
    if (expectedState !== 'PENDING' || !['APPROVED', 'REJECTED'].includes(decision)) {
      return NextResponse.json({ ok: false, code: 'invalid_initiative_decision', error: 'Initiative owner decision is invalid.' }, { status: 400 });
    }
  }

  if (actionCode === 'ACTIVATE_GROWTH_STRATEGY') {
    if (expectedState !== 'DRAFT' || decision !== 'ACTIVATE' || expectedActiveVersion < 0) {
      return NextResponse.json({ ok: false, code: 'invalid_strategy_activation', error: 'Strategy activation state is invalid.' }, { status: 400 });
    }
  }

  const { data, error } = await actor.service.rpc('feya_fn_owner_strategic_action_v1', {
    p_action_code: actionCode,
    p_entity_id: entityId,
    p_expected_state: expectedState,
    p_decision: decision,
    p_reason: reason,
    p_human_user_id: actor.userId,
    p_expected_active_version: expectedActiveVersion,
    p_idempotency_key: idempotencyKey,
  });

  if (error) {
    const message = error.message || 'Strategic owner action failed.';
    const stale = /stale|cannot be activated|does not require human approval|revalidation/i.test(message);
    return NextResponse.json(
      { ok: false, code: stale ? 'stale_strategic_state' : 'strategic_action_failed', error: message },
      { status: stale ? 409 : 500 },
    );
  }

  const messages: Record<string, string> = {
    ACTIVATE_GROWTH_OBJECTIVE: 'Цель роста активирована владельцем.',
    ACTIVATE_GROWTH_STRATEGY: 'Версия стратегии активирована владельцем. Незавершённые инициативы при необходимости отправлены на повторную проверку.',
    HUMAN_APPROVE_INITIATIVE: decision === 'APPROVED'
      ? 'Инициатива одобрена владельцем.'
      : 'Инициатива отклонена владельцем и отменена.',
  };

  return NextResponse.json(
    { ok: true, action: Array.isArray(data) ? data[0] : data, message: messages[actionCode] },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
