import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { dataFreshnessLabel, ownerToneForStatus, scopeLabel, sourceHealthSummary, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Row = Record<string, unknown>;

async function getSystemData(): Promise<{
  readiness: Row[];
  sources: Row[];
  actions: { total: number; available: number; approvalRequired: number };
  executionRequests: number;
  activeIncidents: number;
  mutationFreezes: number;
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return {
    readiness: [],
    sources: [],
    actions: { total: 0, available: 0, approvalRequired: 0 },
    executionRequests: 0,
    activeIncidents: 0,
    mutationFreezes: 0,
    error: getMissingAdminDataEnvMessage(),
  };

  const [
    readinessResult,
    sourceResult,
    actionsResult,
    availableActionsResult,
    approvalActionsResult,
    executionResult,
    incidentsResult,
    freezesResult,
  ] = await Promise.all([
    supabase.from('feya_commerce_v_launch_readiness_summary_safe_v2').select('*').order('readiness_scope'),
    supabase.from('feya_commerce_v_data_source_health_latest_safe_v1')
      .select('source_code,health_state,freshness_state,last_success_at,checked_at,error_message')
      .order('source_code'),
    supabase.from('feya_commerce_v_growth_action_capability_safe_v1')
      .select('action_code', { count: 'exact', head: true }),
    supabase.from('feya_commerce_v_growth_action_capability_safe_v1')
      .select('action_code', { count: 'exact', head: true })
      .eq('action_state', 'AVAILABLE'),
    supabase.from('feya_commerce_v_growth_action_capability_safe_v1')
      .select('action_code', { count: 'exact', head: true })
      .not('approval_class', 'in', '(NONE,NO_APPROVAL)'),
    supabase.from('feya_commerce_v_execution_gateway_safe_v1')
      .select('execution_request_id', { count: 'exact', head: true }),
    supabase.from('feya_commerce_v_change_freeze_status_safe_v1')
      .select('incident_id', { count: 'exact', head: true }),
    supabase.from('feya_commerce_v_change_freeze_status_safe_v1')
      .select('incident_id', { count: 'exact', head: true })
      .eq('freeze_mutations', true),
  ]);

  const firstError =
    readinessResult.error ||
    sourceResult.error ||
    actionsResult.error ||
    availableActionsResult.error ||
    approvalActionsResult.error ||
    executionResult.error ||
    incidentsResult.error ||
    freezesResult.error;

  if (firstError) return {
    readiness: [],
    sources: [],
    actions: { total: 0, available: 0, approvalRequired: 0 },
    executionRequests: 0,
    activeIncidents: 0,
    mutationFreezes: 0,
    error: firstError.message,
  };

  return {
    readiness: (readinessResult.data || []) as Row[],
    sources: (sourceResult.data || []) as Row[],
    actions: {
      total: actionsResult.count || 0,
      available: availableActionsResult.count || 0,
      approvalRequired: approvalActionsResult.count || 0,
    },
    executionRequests: executionResult.count || 0,
    activeIncidents: incidentsResult.count || 0,
    mutationFreezes: freezesResult.count || 0,
  };
}

function toneClass(tone: string) {
  return tone === 'danger' ? 'is-danger' : tone === 'warning' ? 'is-warning' : tone === 'success' ? 'is-success' : tone === 'info' ? 'is-info' : '';
}

export default async function AdminSystemPage() {
  const { readiness, sources, actions, executionRequests, activeIncidents, mutationFreezes, error } = await getSystemData();

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Надёжность</div>
            <h1>Система</h1>
            <p>Здесь видно, можно ли доверять данным и автоматизации. В нормальном состоянии этот раздел должен быть спокойным и коротким.</p>
          </div>
          <Link href="/admin/company/advanced" className="owner-button">Технические детали</Link>
        </header>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-section">
          <div className="owner-section-head"><h2>Готовность</h2></div>
          <div className="owner-grid four">
            {readiness.map((row) => {
              const state = String(row.scope_status || '');
              const tone = ownerToneForStatus(state);
              return (
                <article className={`owner-card ${toneClass(tone)}`} key={String(row.readiness_scope)}>
                  <div className={`owner-status ${toneClass(tone)}`}>{statusLabel(state)}</div>
                  <h3 className="owner-card-title" style={{ marginTop: '10px' }}>{scopeLabel(row.readiness_scope)}</h3>
                  <p className="owner-card-copy">{Number(row.blocking_count || 0)} блокирующих условий</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div><h2>Источники данных</h2><div className="owner-section-kicker">Ограничение показывается рядом с источником, а не прячется в логах</div></div>
            <Link href="/admin/data-health" className="owner-button">Подробнее</Link>
          </div>
          <div className="owner-list">
            {sources.map((row) => {
              const health = String(row.health_state || '');
              const tone = ownerToneForStatus(health);
              return (
                <article className="owner-list-row" key={String(row.source_code)}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(tone)}`}>{statusLabel(health)}</span>
                      <span>{dataFreshnessLabel(row.freshness_state)}</span>
                    </div>
                    <h3>{sourceLabel(row.source_code)}</h3>
                    <p>{sourceHealthSummary(row.source_code)}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Права, выполнение и безопасность</h2>
              <div className="owner-section-kicker">Отдельно от готовности данных: что системе вообще разрешено делать</div>
            </div>
          </div>

          <div className="owner-summary-strip">
            <div className="owner-summary-cell">
              <strong>{actions.available}/{actions.total}</strong>
              <span>Действий реально доступны</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{actions.approvalRequired}</strong>
              <span>Действий требуют одобрения</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{executionRequests}</strong>
              <span>Реальных запросов на выполнение</span>
            </div>
            <div className="owner-summary-cell">
              <strong>{activeIncidents}</strong>
              <span>Активных инцидентов · заморозок: {mutationFreezes}</span>
            </div>
          </div>

          {!actions.available ? (
            <div className="owner-card is-warning" style={{ marginTop: '10px' }}>
              <div className="owner-status is-warning">Автодействия ещё закрыты</div>
              <p className="owner-card-copy">
                Это ожидаемо для текущего этапа: система умеет рассчитывать, проверять и готовить решения, но не должна изображать внешнее выполнение, пока исполнитель, одобрения и журнал результата не готовы.
              </p>
            </div>
          ) : null}
        </section>

        <section className="owner-section">
          <div className="owner-grid three">
            <Link href="/admin/execution-map" className="owner-card">
              <h3 className="owner-card-title">Права и автоматизация</h3>
              <p className="owner-card-copy">Что система может делать сама, что требует одобрения и какие действия пока запрещены.</p>
            </Link>
            <Link href="/admin/metrics" className="owner-card">
              <h3 className="owner-card-title">Метрики</h3>
              <p className="owner-card-copy">Технические определения и доступные сейчас показатели.</p>
            </Link>
            <Link href="/admin/company/advanced" className="owner-card">
              <h3 className="owner-card-title">Технические детали</h3>
              <p className="owner-card-copy">Реестры, проверки, диагностика и инженерная глубина.</p>
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
