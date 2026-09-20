import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentWorkItem } from '@/lib/owner-ui/presenters';
import { OwnerWorkDetailContent } from '@/components/admin/OwnerWorkDetailContent';
import type { GrowthHandoffRow, GrowthWorkflowEventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getWorkItem(id: string): Promise<{
  row?: Row;
  handoffs: GrowthHandoffRow[];
  workflowEvents: GrowthWorkflowEventRow[];
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
  return {
    row: workResult.data as Row,
    handoffs: (handoffResult.data || []) as GrowthHandoffRow[],
    workflowEvents: (workflowEventResult.data || []) as GrowthWorkflowEventRow[],
  };
}

export default async function OwnerWorkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { row, handoffs, workflowEvents, error } = await getWorkItem(id);

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
      </div>
    </main>
  );
}
