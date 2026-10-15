export const instant = false;

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentWorkItem } from '@/lib/owner-ui/presenters';
import { OwnerWorkDetailContent } from '@/components/admin/OwnerWorkDetailContent';
import type { GrowthHandoffRow, GrowthWorkflowEventRow } from '@/lib/types';
type Row = Record<string, unknown>;

async function getWorkItem(id: string): Promise<{
  row?: Row;
  handoffs: GrowthHandoffRow[];
  workflowEvents: GrowthWorkflowEventRow[];
  readinessReceipt?: {
    scanned: number;
    coverage: string;
    observedAt: string;
    counts: Array<[string, number]>;
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
  if (workResult.data.case_type === 'TSEO_INDEXABILITY_SHADOW') {
    const { data: workflow } = await supabase
      .from('feya_growth_workflow_runs_v1')
      .select('state_json,workflow_status')
      .eq('case_id', id)
      .eq('workflow_type', 'RECORD_INDEXABILITY_PROPOSAL')
      .order('created_at', { ascending: false })
      .limit(1).maybeSingle();
    const receiptValue = workflow?.state_json &&
      typeof workflow.state_json === 'object' && !Array.isArray(workflow.state_json)
      ? (workflow.state_json as Record<string, unknown>).indexability_receipt
      : null;
    if (workflow?.workflow_status === 'COMPLETED' &&
        receiptValue && typeof receiptValue === 'object' && !Array.isArray(receiptValue)) {
      const receipt = receiptValue as Record<string, unknown>;
      const raw = receipt.counts_by_status;
      const counts = raw && typeof raw === 'object' && !Array.isArray(raw)
        ? Object.entries(raw as Record<string, unknown>)
            .filter(([key, n]) => key.length < 80 && typeof n === 'number' && Number.isFinite(n) && n >= 0)
            .slice(0, 20) as Array<[string, number]>
        : [];
      readinessReceipt = {
        scanned: typeof receipt.rows_scanned === 'number' ? receipt.rows_scanned : 0,
        coverage: typeof receipt.coverage === 'string' ? receipt.coverage : 'UNKNOWN',
        observedAt: typeof receipt.evidence_time === 'string' ? receipt.evidence_time : '',
        counts,
        note: typeof receipt.conclusion === 'string' ? receipt.conclusion.slice(0, 350) : '',
      };
    }
  }
  return {
    row: workResult.data as Row,
    readinessReceipt,
    handoffs: (handoffResult.data || []) as GrowthHandoffRow[],
    workflowEvents: (workflowEventResult.data || []) as GrowthWorkflowEventRow[],
  };
}

export default async function OwnerWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, handoffs, workflowEvents, readinessReceipt, error } = await getWorkItem(id);

  if (!row && !error) notFound();
  const item = row ? presentWorkItem(row) : null;

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
        {readinessReceipt ? (
          <section className="owner-card" aria-label="Фактический отчёт TSEO">
            <div className="owner-status is-success">Снимок TSEO сохранён</div>
            <h2 className="owner-card-title">Готовность SEO-страниц · наблюдение</h2>
            <p className="owner-card-copy">
              Проверено: {readinessReceipt.scanned} страниц.
              Полнота данных: {readinessReceipt.coverage === 'COMPLETE' ? 'полная выборка' : 'ограниченная или отсутствует'}.
            </p>
            <div className="owner-actions">
              {readinessReceipt.counts.map(([status, count]) => (
                <span key={status} className="owner-status">{status}: {count}</span>
              ))}
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
