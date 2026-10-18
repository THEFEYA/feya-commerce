export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentWorkItem } from '@/lib/owner-ui/presenters';
import { gmelShadowReviewForCase } from '@/lib/owner-ui/gmelShadowReview';
import { evaluateGmelAiAdmission, type GmelAdmissionDecision } from '@/lib/growthGmelAiAdmission';
import { OwnerWorkDetailContent } from '@/components/admin/OwnerWorkDetailContent';
import { OwnerShadowReviewRequestClient } from '@/components/admin/OwnerShadowReviewRequestClient';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';
import type { GrowthHandoffRow, GrowthWorkflowEventRow } from '@/lib/types';
type Row = Record<string, unknown>;

async function getWorkItem(id: string): Promise<{
  row?: Row;
  handoffs: GrowthHandoffRow[];
  workflowEvents: GrowthWorkflowEventRow[];
  gmelAiAdmission?: GmelAdmissionDecision;
  readinessReceipt?: {
    releaseCode: string;
    releaseVersion: number;
    intendedIndex: number;
    intendedNoindex: number;
    approvedProducts: number;
    coverage: string;
    observedAt: string;
    note: string;
  };
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { handoffs: [], workflowEvents: [], error: getMissingAdminDataEnvMessage() };

  const [workResult, handoffResult, workflowEventResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_owner_work_safe_v1')
      .select('*')
      .eq('case_id', id)
      .maybeSingle(),
    supabase
      .from('feya_commerce_v_growth_handoffs_safe_v1')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: true }),
    supabase
      .from('feya_commerce_v_growth_workflow_events_safe_v1')
      .select('*')
      .eq('case_id', id)
      .order('created_at', { ascending: true }),
  ]);

  const firstError = workResult.error || handoffResult.error || workflowEventResult.error;
  if (firstError) return { handoffs: [], workflowEvents: [], error: firstError.message };
  if (!workResult.data) return { handoffs: [], workflowEvents: [] };

  // The owner sees a persisted, bounded evidence summary after leaving the original chat.
  // No raw drafts or private workflow state are sent to the browser.
  let readinessReceipt;
  let gmelAiAdmission: GmelAdmissionDecision | undefined;
  if (workResult.data.case_type === 'TSEO_INDEXABILITY_SHADOW') {
    const [workflowResponse, sourceResponse, roleResponse] = await Promise.all([
      supabase
        .from('feya_growth_workflow_runs_v1')
        .select('state_json,workflow_status')
        .eq('case_id', id)
        .eq('workflow_type', 'RECORD_INDEXABILITY_PROPOSAL')
        .order('created_at', { ascending: false })
        .limit(1).maybeSingle(),
      supabase.from('feya_commerce_v_data_source_health_effective_safe_v2')
        .select('source_code,health_state,freshness_state,checked_at')
        .in('source_code', [
          'ORGANIC_SEARCH_PERFORMANCE',
          'BEHAVIORAL_ANALYTICS',
          'COMMERCE_ORDER_TRUTH',
          'COMMERCE_REVENUE_TRUTH',
        ])
        .limit(4),
      supabase.from('feya_growth_role_activation_v1')
        .select('role_code,runtime_status,allowed_action_codes_json')
        .eq('role_code', 'GMEL')
        .maybeSingle(),
    ]);
    const workflow = workflowResponse.data;
    gmelAiAdmission = evaluateGmelAiAdmission({
      role: roleResponse.error ? null : roleResponse.data,
      sources: sourceResponse.error ? [] : sourceResponse.data || [],
      purpose: 'COMMERCIAL_OUTCOME',
      case_status: String(workResult.data.case_status || 'UNKNOWN'),
      current_accountable_domain: String(workResult.data.current_accountable_domain || 'UNKNOWN'),
      question_is_new_and_semantic: false,
      model_executor_enabled: false,
      budget: null,
      now: new Date(),
    });
    const receiptValue = workflow?.state_json &&
      typeof workflow.state_json === 'object' && !Array.isArray(workflow.state_json)
      ? (workflow.state_json as Record<string, unknown>).indexability_receipt
      : null;
    if (workflow?.workflow_status === 'COMPLETED' &&
        receiptValue && typeof receiptValue === 'object' && !Array.isArray(receiptValue)) {
      const receipt = receiptValue as Record<string, unknown>;
      // No fallback to legacy readiness data: unknown release fields are not reported as zeros.
      if (receipt.template === 'TSEO_ACTIVE_SEARCH_RELEASE_AUDIT_V1' &&
          typeof receipt.release_code === 'string' &&
          typeof receipt.release_version === 'number' &&
          typeof receipt.intended_index === 'number' &&
          typeof receipt.intended_noindex === 'number' &&
          typeof receipt.approved_product_bindings === 'number' &&
          receipt.release_version > 0 &&
          receipt.intended_index >= 0 &&
          receipt.intended_noindex >= 0 &&
          receipt.approved_product_bindings >= 0) {
        readinessReceipt = {
          releaseCode: receipt.release_code.slice(0, 120),
          releaseVersion: receipt.release_version,
          intendedIndex: receipt.intended_index,
          intendedNoindex: receipt.intended_noindex,
          approvedProducts: receipt.approved_product_bindings,
          coverage: typeof receipt.coverage === 'string' ? receipt.coverage : 'UNKNOWN',
          observedAt: typeof receipt.evidence_time === 'string' ? receipt.evidence_time : '',
          note: typeof receipt.conclusion === 'string' ? receipt.conclusion.slice(0, 350) : '',
        };
      }
    }
  }
  return {
    row: workResult.data as Row,
    gmelAiAdmission,
    readinessReceipt,
    handoffs: (handoffResult.data || []) as GrowthHandoffRow[],
    workflowEvents: (workflowEventResult.data || []) as GrowthWorkflowEventRow[],
  };
}

export default async function OwnerWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, handoffs, workflowEvents, gmelAiAdmission, readinessReceipt, error } = await getWorkItem(id);

  if (!row && !error) notFound();
  const gmelReview = row ? gmelShadowReviewForCase(row, handoffs) : null;
  const item = row ? presentWorkItem({ ...row, gmel_review_state: gmelReview?.state }) : null;
  const shadowReviewConfig = getOwnerActionConfigStatus('growth_shadow_work');

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Работа · подробности</div>
            <h1>{item?.title || 'Рабочая ситуация'}</h1>
            <p>Полный owner-facing контекст процесса. Технические коды и диагностика остаются ниже и не заменяют бизнес-смысл работы.</p>
          </div>
          <Link href="/admin/company/work" className="owner-button">Назад к работе</Link>
        </header>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}
        {item ? <OwnerWorkDetailContent item={item} handoffs={handoffs} workflowEvents={workflowEvents} /> : null}
        {gmelReview?.state === 'DETERMINISTIC_RECONCILED' ? (
          <section className="owner-card" aria-label="Автоматическая сверка источников Growth OS">
            <div className="owner-status is-info">Автоматическая SQL-сверка · без AI</div>
            <h2 className="owner-card-title">Факты действующего Search Release согласованы</h2>
            <p className="owner-card-copy">
              Growth OS самостоятельно сверил уникальность URL, состояния index/noindex,
              наличие утверждённых товарных привязок и оригинальный снимок TSEO.
            </p>
            <p className="owner-card-copy">
              Это техническая предварительная проверка, а не независимый AI-анализ GMEL.
              GSC, GA4 и результаты продаж здесь не измерялись. Уровень доказательств
              ограничен L0, бизнес-результат не определён. Кейс остаётся открытым.
            </p>
          </section>
        ) : null}
        {gmelReview?.state === 'OPERATOR_REVIEWED' ? (
          <section className="owner-card" aria-label="Оценка доказательств GMEL">
            <div className="owner-status is-info">Проверка доказательств · с участием ChatGPT</div>
            <h2 className="owner-card-title">GMEL: подтверждён только внутренний Search Release</h2>
            <p className="owner-card-copy">
              Повторный запрос к действующим данным подтвердил непротиворечивость планов index/noindex.
              Уровень доказательств: L0 — наблюдение. Измеренного коммерческого результата пока нет.
            </p>
            <p className="owner-card-copy">
              Проверка выполнена с помощью ChatGPT и сохранена в handoff, а не автономным GMEL-исполнителем.
              Статистика индексации Google, GSC-клики и GA4-конверсии не подтверждены.
              Это не разрешение менять SEO-тексты, метаданные или индексацию.
            </p>
            <div className="owner-status">Кейс остаётся открытым до корректного следующего решения</div>
          </section>
        ) : null}
        {item && row?.case_status === 'OPEN' && readinessReceipt &&
          (gmelReview?.state === 'DETERMINISTIC_RECONCILED' || gmelReview?.state === 'OPERATOR_REVIEWED') ? (
          <OwnerShadowReviewRequestClient
            caseId={item.id}
            enabled={shadowReviewConfig.ready}
            blockers={shadowReviewConfig.blockers}
          />
        ) : null}
        {gmelAiAdmission && !gmelAiAdmission.allowed_to_dispatch ? (
          <section className="owner-card" aria-label="Готовность автономного анализа GMEL">
            <div className="owner-status is-warning">Автономный анализ GMEL пока выключен</div>
            <h2 className="owner-card-title">Что нужно для измеримого улучшения</h2>
            <p className="owner-card-copy">
              Техническая проверка Search Release завершена. Для оценки реальных результатов
              необходимы свежие данные поиска, посещений и подтверждённых заказов.
              Пока их нет, нельзя заявлять о росте конверсии или эффективности.
            </p>
            <div className="owner-actions" aria-label="Состояние источников">
              <span className="owner-status">GSC: {gmelAiAdmission.source_states.ORGANIC_SEARCH_PERFORMANCE || 'UNKNOWN'}</span>
              <span className="owner-status">GA4: {gmelAiAdmission.source_states.BEHAVIORAL_ANALYTICS || 'UNKNOWN'}</span>
              <span className="owner-status">Заказы: {gmelAiAdmission.source_states.COMMERCE_ORDER_TRUTH || 'UNKNOWN'}</span>
            </div>
            <p className="owner-card-copy">
              AI-модель не запускается автоматически: требуется новая содержательная задача,
              утверждённый владельцем бюджет и отдельная защищённая очередь исполнения.
              Платных вызовов отсюда не происходит.
            </p>
          </section>
        ) : null}
        {readinessReceipt ? (
          <section className="owner-card" aria-label="Фактический отчёт TSEO">
            <div className="owner-status is-success">Снимок TSEO сохранён</div>
            <h2 className="owner-card-title">Действующий Search Release v{readinessReceipt.releaseVersion}</h2>
            <p className="owner-card-copy">
              Код: {readinessReceipt.releaseCode}. URL по утверждённому плану:
              {' '}{readinessReceipt.intendedIndex + readinessReceipt.intendedNoindex}.
              Полнота: {readinessReceipt.coverage === 'COMPLETE' ? 'подтверждённая' : 'не подтверждена'}.
            </p>
            <div className="owner-actions">
              <span className="owner-status">index: {readinessReceipt.intendedIndex}</span>
              <span className="owner-status">noindex: {readinessReceipt.intendedNoindex}</span>
              <span className="owner-status">Утверждённых товаров: {readinessReceipt.approvedProducts}</span>
            </div>
            <p className="owner-card-copy">{readinessReceipt.note}</p>
            <p className="owner-card-copy">
              Это не подтверждение индексации Google. Независимый AI-аудит не выполнялся, товары не изменялись.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
