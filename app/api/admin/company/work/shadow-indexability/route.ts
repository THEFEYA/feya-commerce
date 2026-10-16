import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';
import { getActiveSearchEvidence } from '@/lib/owner-ui/activeSearchReleaseEvidenceServer';
import { TSEO_SHADOW_RELEASE_QUESTION, TSEO_SHADOW_RELEASE_TEMPLATE } from '@/lib/growthShadowTaskContract';

// Use exactly the same ACTIVE release reader as the CEO and System admin pages.
// The old portfolio readiness view precedes Search Release v12 and cannot be used as active truth.
const STEP = 'VERIFY_ACTIVE_SEARCH_RELEASE';
const ACTION = 'RECORD_INDEXABILITY_PROPOSAL';
const ROLE = 'TSEO';

// A deterministic continuation, not a GMEL LLM or a business outcome.
// Service-only Supabase RPC atomically persists an idempotent handoff and its
// verified L0/source-consistency receipt. If it fails, the TSEO receipt remains.
async function advanceDeterministicReview(
  service: { rpc: (name: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown; error: { message?: string } | null }> },
  caseId: string,
  workflowRunId: string,
  ownershipEpoch: number,
) {
  const { data, error } = await service.rpc('feya_fn_reconcile_tseo_gmel_release_v1', {
    p_case_id: caseId,
    p_expected_ownership_epoch: ownershipEpoch,
    p_source_workflow_run_id: workflowRunId,
  });
  if (error || !Array.isArray(data) || data.length !== 1 ||
      typeof data[0]?.handoff_id !== 'string') {
    return { status: 'PENDING', method: 'NOT_RUN', model_calls: 0, changes_applied: 0 };
  }
  const result = data[0] as Record<string, unknown>;
  return {
    status: String(result.handoff_status || 'PENDING'),
    method: String(result.review_method || 'NOT_RUN'),
    handoff_id: result.handoff_id,
    model_calls: 0,
    changes_applied: 0,
  };
}

const headers = { 'Cache-Control': 'private, no-store' };

function respond(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status, headers });
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export async function POST(request: NextRequest) {
  const actor = await requireOwnerActionActor('growth_shadow_work');
  if (!actor.ok) return respond({ ok: false, code: actor.code, error: actor.error }, actor.status);

  let input: Record<string, unknown>;
  try {
    const parsed: unknown = await request.json();
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('bad_body');
    input = parsed as Record<string, unknown>;
  } catch {
    return respond({ ok: false, code: 'invalid_json', error: 'Некорректное задание.' }, 400);
  }

  // One fixed read-only workflow. No user-selected action, role, model or URL is executable.
  const question = cleanText(input.question) || TSEO_SHADOW_RELEASE_QUESTION;
  const requestId = cleanText(input.request_id);
  if (!isUuid(requestId) || question !== TSEO_SHADOW_RELEASE_QUESTION) {
    return respond({ ok: false, code: 'invalid_shadow_request', error: 'Некорректный идентификатор или текст задания.' }, 400);
  }
  if (Object.keys(input).some((key) => !['request_id', 'question'].includes(key))) {
    return respond({ ok: false, code: 'unsupported_shadow_fields', error: 'Эта проверка не принимает произвольные команды.' }, 400);
  }

  const { data: begun, error: intakeError } = await actor.service.rpc('feya_fn_start_tseo_shadow_readiness_v1', {
    p_actor_user_id: actor.userId,
    p_business_question: question,
    p_request_key: requestId,
  });
  if (intakeError) return respond({
    ok: false,
    code: 'growth_shadow_intake_unavailable',
    error: 'Не удалось зарегистрировать рабочую задачу. Проверьте готовность Growth OS.',
  }, 503);
  const task = Array.isArray(begun) ? begun[0] : begun;
  if (!task || typeof task.case_id !== 'string' || typeof task.workflow_run_id !== 'string') {
    return respond({ ok: false, code: 'growth_shadow_missing_workflow' }, 503);
  }
  const caseId = task.case_id as string;
  const workflowRunId = task.workflow_run_id as string;
  const ownershipEpoch = Number(task.ownership_epoch);
  // Unique per execution attempt: a late HTTP worker must never complete a newer lease.
  const workerId = 'tseo-shadow:' + crypto.randomUUID();

  const { data: claimed, error: claimError } = await actor.service.rpc('feya_fn_claim_bound_workflow_v1', {
    p_workflow_run_id: workflowRunId,
    p_expected_case_id: caseId,
    p_expected_ownership_epoch: ownershipEpoch,
    p_expected_accountable_domain: ROLE,
    p_expected_workflow_type: ACTION,
    p_expected_step_code: STEP,
    p_worker_id: workerId,
    p_lease_seconds: 180,
  });

  if (claimError) {
    return respond({ ok: false, code: 'growth_shadow_claim_blocked',
      case_id: caseId, workflow_run_id: workflowRunId,
      error: 'Задача зарегистрирована, но исполнитель не получил разрешение. Результат не создан.' }, 409);
  }

  if (!Array.isArray(claimed) || !claimed.length) {
    // Network retry after completion must return the canonical receipt, not rerun work.
    const { data: existing } = await actor.service.from('feya_growth_workflow_runs_v1')
      .select('workflow_status,state_json').eq('workflow_run_id', workflowRunId).eq('case_id', caseId).maybeSingle();
    const previous = existing?.state_json && typeof existing.state_json === 'object'
      ? (existing.state_json as Record<string, unknown>).indexability_receipt
      : null;
    const gmelReview = existing?.workflow_status === 'COMPLETED' && previous
      ? await advanceDeterministicReview(actor.service, caseId, workflowRunId, ownershipEpoch)
      : null;
    return respond({
      ok: true, case_id: caseId, workflow_run_id: workflowRunId,
      status: existing?.workflow_status || 'WAITING',
      receipt: existing?.workflow_status === 'COMPLETED' ? previous ?? null : null,
      gmel_review: gmelReview,
      reused: true,
      message: existing?.workflow_status === 'COMPLETED'
        ? 'Предыдущая проверка уже сохранена.'
        : 'Задача сохранена и находится в работе или ожидает повтора.',
    }, existing?.workflow_status === 'COMPLETED' ? 200 : 202);
  }

  try {
    const active = await getActiveSearchEvidence();
    if (!active.value) throw new Error('active_search_release_unverified');

    const verified = active.value;
    if (!verified.releaseCode ||
        !Number.isInteger(verified.releaseVersion) || verified.releaseVersion < 1 ||
        !Number.isInteger(verified.intendedIndex) || verified.intendedIndex < 0 ||
        !Number.isInteger(verified.intendedNoindex) || verified.intendedNoindex < 0 ||
        !Number.isInteger(verified.approvedProducts) || verified.approvedProducts < 0 ||
        verified.intendedIndex + verified.intendedNoindex < 1) {
      throw new Error('active_search_release_evidence_incomplete');
    }
    const receipt = {
      template: TSEO_SHADOW_RELEASE_TEMPLATE,
      source: 'feya_search_releases_v1:ACTIVE',
      source_kind: 'canonical_release_intent_not_google_actual_indexing',
      evidence_time: new Date().toISOString(),
      release_code: verified.releaseCode,
      release_version: verified.releaseVersion,
      target_origin: verified.targetOrigin,
      intended_urls_counted: verified.intendedIndex + verified.intendedNoindex,
      intended_index: verified.intendedIndex,
      intended_noindex: verified.intendedNoindex,
      approved_product_bindings: verified.approvedProducts,
      coverage: 'COMPLETE',
      independent_agent_qa: 'NOT_RUN',
      changes_applied: 0,
      model_calls: 0,
      conclusion: 'Проверен действующий Search Release и его разрешённые состояния URL. Это не число страниц в индексе Google и не согласование новой индексации.',
    };

    const { data: finished, error: completeError } = await actor.service.rpc('feya_fn_complete_bound_workflow_v1', {
      p_workflow_run_id: workflowRunId,
      p_expected_case_id: caseId,
      p_expected_ownership_epoch: ownershipEpoch,
      p_expected_accountable_domain: ROLE,
      p_expected_workflow_type: ACTION,
      p_expected_step_code: STEP,
      p_worker_id: workerId,
      p_result_state_patch: { indexability_receipt: receipt },
    });
    if (completeError || !Array.isArray(finished) || !finished.length ||
        finished[0]?.workflow_status !== 'COMPLETED') {
      throw new Error('growth_shadow_completion_rejected');
    }

    // This second step is safe to retry and cannot overwrite a human review.
    // It has no network model call and records the method honestly in Supabase.
    const gmelReview = await advanceDeterministicReview(actor.service, caseId, workflowRunId, ownershipEpoch);
    return respond({
      ok: true, case_id: caseId, workflow_run_id: workflowRunId,
      status: 'COMPLETED', receipt, gmel_review: gmelReview,
      reused: !task.created_new,
      message: gmelReview.status === 'COMPLETED'
        ? 'TSEO и автоматическая проверка фактов сохранены. Самостоятельный AI-анализ GMEL не запускался.'
        : 'TSEO сохранён, но проверка фактов GMEL ещё ожидает повтора. Никаких изменений сайта не было.',
    });
  } catch {
    // A failed source read cannot become a successful business conclusion.
    await actor.service.rpc('feya_fn_fail_workflow_v1', {
      p_workflow_run_id: workflowRunId,
      p_worker_id: workerId,
      p_error: 'ACTIVE Search Release could not be independently verified by the canonical server reader.',
      p_retry_after_seconds: 300,
    });
    return respond({ ok: false, code: 'growth_shadow_execution_failed',
      case_id: caseId, workflow_run_id: workflowRunId,
      error: 'Проверка не завершилась. Состояние сохранено для повторного выполнения.' }, 503);
  }
}
