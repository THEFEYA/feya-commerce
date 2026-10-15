import { NextRequest, NextResponse } from 'next/server';
import { requireOwnerActionActor } from '@/lib/ownerActionAuth';

type WorkRow = {
  seo_page_id?: unknown;
  page_type?: unknown;
  indexability_readiness_status?: unknown;
  indexation_intent?: unknown;
  portfolio_status?: unknown;
  primary_ownership_count?: unknown;
};

const SOURCE_VIEW = 'feya_commerce_v_page_indexability_readiness_v1';
const MAX_ROWS = 300;
const STEP = 'READ_PORTFOLIO_INDEXABILITY';
const ACTION = 'RECORD_INDEXABILITY_PROPOSAL';
const ROLE = 'TSEO';
const QUESTION_DEFAULT = 'Какие SEO-страницы сейчас требуют дополнительной проверки готовности к индексации?';

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

function countReadiness(rows: WorkRow[]) {
  const countsByStatus: Record<string, number> = {};
  const countsByType: Record<string, number> = {};
  const ids = new Set<string>();
  for (const row of rows) {
    if (typeof row.seo_page_id !== 'string' || !isUuid(row.seo_page_id) ||
        typeof row.indexability_readiness_status !== 'string' ||
        !row.indexability_readiness_status.trim() ||
        typeof row.page_type !== 'string' || !row.page_type.trim()) {
      throw new Error('indexability_source_schema_invalid');
    }
    if (ids.has(row.seo_page_id)) throw new Error('indexability_duplicate_page_id');
    ids.add(row.seo_page_id);
    const status = row.indexability_readiness_status.trim().slice(0, 80);
    const type = row.page_type.trim().slice(0, 60);
    countsByStatus[status] = (countsByStatus[status] ?? 0) + 1;
    countsByType[type] = (countsByType[type] ?? 0) + 1;
  }
  if (Object.values(countsByStatus).reduce((n, x) => n + x, 0) !== rows.length) {
    throw new Error('indexability_count_reconciliation_failed');
  }
  return { countsByStatus, countsByType };
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
  const question = cleanText(input.question) || QUESTION_DEFAULT;
  const requestId = cleanText(input.request_id);
  if (!isUuid(requestId) || question.length < 12 || question.length > 500) {
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
    return respond({
      ok: true, case_id: caseId, workflow_run_id: workflowRunId,
      status: existing?.workflow_status || 'WAITING',
      receipt: existing?.workflow_status === 'COMPLETED' ? previous ?? null : null,
      reused: true,
      message: existing?.workflow_status === 'COMPLETED'
        ? 'Предыдущая проверка уже сохранена.'
        : 'Задача сохранена и находится в работе или ожидает повтора.',
    }, existing?.workflow_status === 'COMPLETED' ? 200 : 202);
  }

  try {
    const { data, error } = await actor.service.from(SOURCE_VIEW)
      .select('seo_page_id,page_type,indexability_readiness_status,indexation_intent,portfolio_status,primary_ownership_count')
      .order('seo_page_id', { ascending: true }).limit(MAX_ROWS + 1);
    if (error) throw new Error('indexability_source_unavailable');

    const all = (data || []) as WorkRow[];
    const incomplete = all.length > MAX_ROWS;
    const rows = incomplete ? all.slice(0, MAX_ROWS) : all;
    const summary = countReadiness(rows);
    const receipt = {
      template: 'TSEO_INDEXABILITY_READINESS_V1',
      source: SOURCE_VIEW,
      source_kind: 'internal_portfolio_not_google_index_status',
      evidence_time: new Date().toISOString(),
      rows_scanned: rows.length,
      coverage: incomplete ? 'PARTIAL' : rows.length ? 'COMPLETE' : 'NOT_OBSERVABLE',
      counts_by_status: summary.countsByStatus,
      counts_by_type: summary.countsByType,
      independent_agent_qa: 'NOT_RUN',
      changes_applied: 0,
      model_calls: 0,
      conclusion: incomplete
        ? 'В выборке больше 300 страниц: полноценное заключение заблокировано.'
        : rows.length === 0
          ? 'Нет наблюдаемых страниц для заключения.'
          : 'Снимок готовности портфеля получен. Это не подтверждение индексации Google и не разрешение публикации.',
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

    return respond({
      ok: true, case_id: caseId, workflow_run_id: workflowRunId,
      status: 'COMPLETED', receipt, reused: !task.created_new,
      message: 'Проверка фактических данных сохранена. Независимый AI-аудит пока не запускался.',
    });
  } catch {
    // A failed source read cannot become a successful business conclusion.
    await actor.service.rpc('feya_fn_fail_workflow_v1', {
      p_workflow_run_id: workflowRunId,
      p_worker_id: workerId,
      p_error: 'Shadow readiness source or completion failed; investigate before retry.',
      p_retry_after_seconds: 300,
    });
    return respond({ ok: false, code: 'growth_shadow_execution_failed',
      case_id: caseId, workflow_run_id: workflowRunId,
      error: 'Проверка не завершилась. Состояние сохранено для повторного выполнения.' }, 503);
  }
}
