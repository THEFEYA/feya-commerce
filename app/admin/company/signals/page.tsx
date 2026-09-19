import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { presentSignal } from '@/lib/owner-ui/presenters';
import { admissionLabel } from '@/lib/owner-ui/terminology';
import { OwnerSignalDrawerClient } from '@/components/admin/OwnerSignalDrawerClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getSignals(): Promise<{ rows: Row[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_signal_candidates_safe_v2')
    .select('signal_fingerprint,signal_code,title,summary,next_action,priority,accountable_domain,signal_state,case_admission_recommendation,materiality_score,evidence_json,entity_scope_json,generated_at')
    .order('priority', { ascending: true })
    .order('materiality_score', { ascending: false })
    .order('signal_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as Row[] };
}

function toneClass(tone: string) {
  return tone === 'danger'
    ? 'is-danger'
    : tone === 'warning'
      ? 'is-warning'
      : tone === 'success'
        ? 'is-success'
        : tone === 'info'
          ? 'is-info'
          : '';
}

function routingOrder(value: unknown) {
  const key = String(value || '');
  if (key === 'OWNER_DECISION_REQUIRED') return 0;
  if (key === 'WORK_QUEUE') return 1;
  if (key === 'IMPLEMENTATION_ACTION') return 2;
  if (key === 'MONITOR') return 3;
  return 4;
}

export default async function AdminSignalsPage() {
  const { rows, error } = await getSignals();
  const prepared = rows
    .sort((a, b) => routingOrder(a.case_admission_recommendation) - routingOrder(b.case_admission_recommendation))
    .map((row) => ({
      row,
      vm: presentSignal(row),
      routing: admissionLabel(row.case_admission_recommendation),
    }));

  const ownerCount = rows.filter((row) => row.case_admission_recommendation === 'OWNER_DECISION_REQUIRED').length;
  const workCount = rows.filter((row) => row.case_admission_recommendation === 'WORK_QUEUE').length;
  const implementationCount = rows.filter((row) => row.case_admission_recommendation === 'IMPLEMENTATION_ACTION').length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Наблюдение</div>
            <h1>Сигналы</h1>
            <p>
              Система показывает понятную бизнес-интерпретацию. Внутренние коды и техническая маршрутизация доступны отдельно.
            </p>
          </div>
          <Link href="/admin/signals" className="owner-button">Технические детали</Link>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '24px' }}>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Всего активных сигналов</span></div>
          <div className="owner-summary-cell"><strong>{ownerCount}</strong><span>Нужно ваше решение</span></div>
          <div className="owner-summary-cell"><strong>{workCount}</strong><span>Можно передать в работу</span></div>
          <div className="owner-summary-cell"><strong>{implementationCount}</strong><span>Требуется изменение системы</span></div>
        </section>

        {error ? (
          <div className="owner-card is-danger">
            <div className="owner-status is-danger">Ошибка данных</div>
            <p className="owner-card-copy">{error}</p>
          </div>
        ) : null}

        <section className="owner-list">
          {prepared.map(({ row, vm, routing }) => (
            <article className="owner-list-row" key={vm.id}>
              <div className="owner-list-row-main">
                <div className="owner-card-meta">
                  <span className={`owner-status ${toneClass(vm.tone)}`}>{vm.priorityLabel}</span>
                  <span>{routing}</span>
                  <span>{vm.ownerLabel}</span>
                  <span>{vm.statusLabel}</span>
                </div>
                <h3>{vm.title}</h3>
                <p>{vm.summary}</p>
              </div>
              <div className="owner-list-row-side">
                <OwnerSignalDrawerClient
                  vm={vm}
                  routing={routing}
                  recommendation={String(row.case_admission_recommendation || '')}
                  evidence={(row.evidence_json || {}) as Record<string, unknown>}
                  generatedAt={row.generated_at ? String(row.generated_at) : null}
                />
              </div>
            </article>
          ))}
        </section>

        {!error && prepared.length === 0 ? (
          <div className="owner-empty">Сейчас активных сигналов нет.</div>
        ) : null}
      </div>
    </main>
  );
}
