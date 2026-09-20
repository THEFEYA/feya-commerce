import Link from 'next/link';
import { Database, LockKeyhole, PlayCircle, ShieldCheck, Siren, UserCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { dataFreshnessLabel, ownerToneForStatus, scopeLabel, sourceHealthSummary, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';
import { getAdminAuthConfigStatus } from '@/lib/supabaseAuth';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';
import { getSupabaseServiceRoleClient } from '@/lib/supabaseAdmin';

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
  ownerActionAudit: Row[];
  adminBoundary: { registered: number; browserReadable: number } | null;
  aiUsage: {
    invocations: number;
    meteredInvocations: number;
    unmeteredInvocations: number;
    totalTokens: number;
    inputTokens: number;
    outputTokens: number;
    avgLatencyMs: number | null;
    lastInvocationAt: string | null;
  };
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
    ownerActionAudit: [],
    adminBoundary: null,
    aiUsage: { invocations: 0, meteredInvocations: 0, unmeteredInvocations: 0, totalTokens: 0, inputTokens: 0, outputTokens: 0, avgLatencyMs: null, lastInvocationAt: null },
    error: getMissingAdminDataEnvMessage(),
  };

  const serviceRole = getSupabaseServiceRoleClient();

  const [
    readinessResult,
    sourceResult,
    actionsResult,
    availableActionsResult,
    approvalActionsResult,
    executionResult,
    incidentsResult,
    freezesResult,
    ownerActionAuditResult,
    adminBoundaryResult,
    aiUsageResult,
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
      .or('approval_class.ilike.%HUMAN%,approval_class.eq.DIRECTOR_GATE'),
    supabase.from('feya_commerce_v_execution_gateway_safe_v1')
      .select('execution_request_id', { count: 'exact', head: true }),
    supabase.from('feya_commerce_v_change_freeze_status_safe_v1')
      .select('incident_id', { count: 'exact', head: true }),
    supabase.from('feya_commerce_v_change_freeze_status_safe_v1')
      .select('incident_id', { count: 'exact', head: true })
      .eq('freeze_mutations', true),
    supabase.from('feya_commerce_v_owner_action_audit_safe_v1')
      .select('owner_action_audit_id,action_code,entity_type,entity_id,decision_code,reason,result_json,created_at')
      .order('created_at', { ascending: false })
      .limit(20),
    serviceRole
      ? serviceRole.rpc('feya_fn_preview_admin_data_boundary_v1')
      : Promise.resolve({ data: null, error: null }),
    serviceRole
      ? serviceRole
          .from('feya_commerce_v_ai_usage_daily_v1')
          .select('usage_day,invocation_count,metered_invocation_count,unmetered_invocation_count,input_tokens,output_tokens,total_tokens,avg_latency_ms,last_invocation_at')
          .gte('usage_day', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
          .order('usage_day', { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);

  const firstError =
    readinessResult.error ||
    sourceResult.error ||
    actionsResult.error ||
    availableActionsResult.error ||
    approvalActionsResult.error ||
    executionResult.error ||
    incidentsResult.error ||
    freezesResult.error ||
    ownerActionAuditResult.error ||
    adminBoundaryResult.error ||
    aiUsageResult.error;

  const adminBoundaryRows = Array.isArray(adminBoundaryResult.data) ? adminBoundaryResult.data : [];
  const adminBoundary = serviceRole
    ? {
        registered: adminBoundaryRows.length,
        browserReadable: adminBoundaryRows.filter((row) => row?.anon_select || row?.authenticated_select).length,
      }
    : null;

  const aiRows = Array.isArray(aiUsageResult.data) ? aiUsageResult.data : [];
  const latencyRows = aiRows.filter((row) => Number.isFinite(Number(row?.avg_latency_ms)) && Number(row?.invocation_count || 0) > 0);
  const latencyWeight = latencyRows.reduce((sum, row) => sum + Number(row?.invocation_count || 0), 0);
  const aiUsage = {
    invocations: aiRows.reduce((sum, row) => sum + Number(row?.invocation_count || 0), 0),
    meteredInvocations: aiRows.reduce((sum, row) => sum + Number(row?.metered_invocation_count || 0), 0),
    unmeteredInvocations: aiRows.reduce((sum, row) => sum + Number(row?.unmetered_invocation_count || 0), 0),
    totalTokens: aiRows.reduce((sum, row) => sum + Number(row?.total_tokens || 0), 0),
    inputTokens: aiRows.reduce((sum, row) => sum + Number(row?.input_tokens || 0), 0),
    outputTokens: aiRows.reduce((sum, row) => sum + Number(row?.output_tokens || 0), 0),
    avgLatencyMs: latencyWeight
      ? Math.round(latencyRows.reduce((sum, row) => sum + Number(row?.avg_latency_ms || 0) * Number(row?.invocation_count || 0), 0) / latencyWeight)
      : null,
    lastInvocationAt: aiRows
      .map((row) => String(row?.last_invocation_at || ''))
      .filter(Boolean)
      .sort()
      .at(-1) || null,
  };

  if (firstError) return {
    readiness: [],
    sources: [],
    actions: { total: 0, available: 0, approvalRequired: 0 },
    executionRequests: 0,
    activeIncidents: 0,
    mutationFreezes: 0,
    ownerActionAudit: (ownerActionAuditResult.data || []) as Row[],
    adminBoundary,
    aiUsage,
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
    ownerActionAudit: (ownerActionAuditResult.data || []) as Row[],
    adminBoundary,
    aiUsage,
  };
}

function healthRank(value: unknown) {
  const key = String(value || '').toUpperCase();
  if (key === 'UNAVAILABLE') return 0;
  if (key === 'DEGRADED' || key === 'AVAILABLE_WITH_LIMITATIONS' || key === 'STALE') return 1;
  if (key === 'NOT_OBSERVABLE') return 2;
  if (key === 'HEALTHY' || key === 'AVAILABLE') return 4;
  return 3;
}

function toneClass(tone: string) {
  return tone === 'danger' ? 'is-danger' : tone === 'warning' ? 'is-warning' : tone === 'success' ? 'is-success' : tone === 'info' ? 'is-info' : '';
}

function sourceTimestamp(value: unknown) {
  if (!value) return 'успешного обновления ещё не было';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'время обновления не определено';
  return `обновлено ${new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date)}`;
}

export default async function AdminSystemPage() {
  const { readiness, sources, actions, executionRequests, activeIncidents, mutationFreezes, ownerActionAudit, adminBoundary, aiUsage, error } = await getSystemData();
  const ownerAuth = getAdminAuthConfigStatus();
  const ownerActions = getOwnerActionConfigStatus();
  const blockedReadiness = readiness.filter((row) => String(row.scope_status || '').toUpperCase() !== 'PASS');
  const healthyReadiness = readiness.filter((row) => String(row.scope_status || '').toUpperCase() === 'PASS');
  const sourceIssues = [...sources]
    .filter((row) => !['HEALTHY', 'AVAILABLE'].includes(String(row.health_state || '').toUpperCase()))
    .sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state));
  const healthySources = [...sources]
    .filter((row) => ['HEALTHY', 'AVAILABLE'].includes(String(row.health_state || '').toUpperCase()))
    .sort((a, b) => sourceLabel(a.source_code).localeCompare(sourceLabel(b.source_code), 'ru'));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Надёжность</div>
            <h1>Система</h1>
            <p>Можно ли доверять данным, что ещё блокирует запуск и какие действия системе действительно разрешены.</p>
          </div>
          <Link href="/admin/company/advanced" className="owner-button">Технические детали</Link>
        </header>

        <nav className="owner-subnav" aria-label="Разделы системы">
          <a href="#readiness">Готовность</a>
          <a href="#sources">Источники данных</a>
          <a href="#permissions">Права и автоматизация</a>
          <a href="#ai-usage">Использование ИИ</a>
          <Link href="/admin/company/advanced">Технические детали</Link>
        </nav>

        {error ? <OwnerDataError error={error} /> : null}

        <section className="owner-section" id="readiness">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-attention" aria-hidden="true"><LockKeyhole size={17} strokeWidth={1.7} /></span>
              <div><h2>Что мешает запуску</h2><div className="owner-section-kicker">Нормальные зоны не занимают главный экран</div></div>
            </div>
          </div>

          {blockedReadiness.length ? (
            <div className="owner-grid two">
              {blockedReadiness.map((row) => {
                const state = String(row.scope_status || '');
                const tone = ownerToneForStatus(state);
                return (
                  <article className={`owner-card ${toneClass(tone)}`} key={String(row.readiness_scope)}>
                    <div className={`owner-status ${toneClass(tone)}`}>{statusLabel(state)}</div>
                    <h3 className="owner-card-title" style={{ marginTop: '10px' }}>{scopeLabel(row.readiness_scope)}</h3>
                    <p className="owner-card-copy">
                      {Number(row.blocking_count || 0)} блокирующих условий · {Number(row.warn_count || 0)} предупреждений
                    </p>
                    <div className="owner-actions">
                      <Link href="/admin/launch-readiness" className="owner-button">Что именно блокирует</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Критичных ограничений нет</div>
              <p className="owner-card-copy">Все проверяемые зоны сейчас проходят обязательные условия.</p>
            </div>
          )}

          {healthyReadiness.length ? (
            <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '10px' }}>
              <summary>
                <span><strong>Зоны без блокировок</strong><small>Скрыты, потому что сейчас не требуют вашего внимания</small></span>
                <span className="owner-section-kicker">{healthyReadiness.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                {healthyReadiness.map((row) => <span key={String(row.readiness_scope)}>{scopeLabel(row.readiness_scope)}</span>)}
              </div>
            </details>
          ) : null}
        </section>

        <section className="owner-section" id="sources">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-info" aria-hidden="true"><Database size={17} strokeWidth={1.7} /></span>
              <div><h2>Источники данных</h2><div className="owner-section-kicker">Сначала только источники, которые ограничивают решения</div></div>
            </div>
            <Link href="/admin/data-health" className="owner-button">Все источники</Link>
          </div>

          {sourceIssues.length ? (
            <div className="owner-list">
              {sourceIssues.map((row) => {
                const health = String(row.health_state || '');
                const tone = ownerToneForStatus(health);
                return (
                  <article className="owner-list-row" key={String(row.source_code)}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span className={`owner-status ${toneClass(tone)}`}>{statusLabel(health)}</span>
                        <span>{dataFreshnessLabel(row.freshness_state)}</span>
                        <span>{sourceTimestamp(row.last_success_at)}</span>
                      </div>
                      <h3>{sourceLabel(row.source_code)}</h3>
                      <p>{sourceHealthSummary(row.source_code)}</p>
                    </div>
                    <div className="owner-list-row-side">
                      <Link href="/admin/data-health" className="owner-button">Подробнее</Link>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Источники без критичных проблем</div>
              <p className="owner-card-copy">Нет источников, состояние которых сейчас требует внимания владельца.</p>
            </div>
          )}

          {healthySources.length ? (
            <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '10px' }}>
              <summary>
                <span><strong>Работают нормально</strong><small>Здоровые источники скрыты по умолчанию</small></span>
                <span className="owner-section-kicker">{healthySources.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                {healthySources.map((row) => <span key={String(row.source_code)}>{sourceLabel(row.source_code)}</span>)}
              </div>
            </details>
          ) : null}
        </section>

        <section className="owner-section" id="permissions">
          <div className="owner-section-head">
            <div className="owner-section-heading">
              <span className="owner-section-icon is-system" aria-hidden="true"><ShieldCheck size={17} strokeWidth={1.7} /></span>
              <div><h2>Права, выполнение и безопасность</h2><div className="owner-section-kicker">Отдельно от готовности данных: что системе вообще разрешено делать</div></div>
            </div>
          </div>

          <div className="owner-queue-strip" aria-label="Права и выполнение">
            <Link href="/admin/execution-map" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Доступные действия</strong><small>из {actions.total} зарегистрированных</small></span>
              <b>{actions.available}</b>
            </Link>
            <Link href="/admin/execution-map?approval=human" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><UserCheck size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Нужно одобрение</strong><small>человек или владелец</small></span>
              <b>{actions.approvalRequired}</b>
            </Link>
            <Link href="/admin/executions" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><PlayCircle size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Запросы выполнения</strong><small>фактически созданы</small></span>
              <b>{executionRequests}</b>
            </Link>
            <Link href="/admin/incidents" className="owner-queue-item">
              <span className="owner-queue-icon" aria-hidden="true"><Siren size={15} strokeWidth={1.7} /></span>
              <span className="owner-queue-copy"><strong>Инциденты</strong><small>заморозок: {mutationFreezes}</small></span>
              <b>{activeIncidents}</b>
            </Link>
          </div>

          {adminBoundary ? (
            <div className={`owner-card ${adminBoundary.browserReadable ? 'is-warning' : 'is-success'}`} style={{ marginTop: '10px' }}>
              <div className={`owner-status ${adminBoundary.browserReadable ? 'is-warning' : 'is-success'}`}>
                {adminBoundary.browserReadable ? 'Защита ещё не завершена' : 'Внутренние данные защищены'}
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>
                {adminBoundary.browserReadable
                  ? 'Часть внутренних данных пока читается рабочим интерфейсом напрямую'
                  : 'Рабочие данные читаются через защищённый серверный контур'}
              </h3>
              <p className="owner-card-copy">
                {adminBoundary.browserReadable
                  ? 'Это временное состояние до проверки обязательного входа владельца. Усиление защиты специально не включается раньше времени, чтобы не сломать утверждённую товарную админку.'
                  : 'Обычный браузер больше не является прямым источником доступа к внутренним административным данным.'}
              </p>
              <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '12px' }}>
                <summary>
                  <span><strong>Техническая проверка</strong><small>Количество внутренних представлений</small></span>
                  <span className="owner-section-kicker">Подробнее</span>
                </summary>
                <div className="owner-disclosure-body owner-card-meta" style={{ marginBottom: 0 }}>
                  <span>всего: {adminBoundary.registered}</span>
                  <span>ещё читаются напрямую: {adminBoundary.browserReadable}</span>
                </div>
              </details>
            </div>
          ) : null}

          <div className="owner-grid two" style={{ marginTop: '10px' }}>
            <article className={`owner-card ${ownerActions.ready ? 'is-success' : 'is-warning'}`}>
              <div className={`owner-status ${ownerActions.ready ? 'is-success' : 'is-warning'}`}>
                {ownerActions.ready ? 'Protected owner actions готовы' : 'Protected owner actions заблокированы'}
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Действия владельца</h3>
              <p className="owner-card-copy">
                {ownerActions.ready
                  ? 'Включены обязательная авторизация, allowlist, защищённый серверный исполнитель и отдельный switch owner actions. Каждое действие всё равно проходит собственные проверки и аудит.'
                  : 'UI и серверный путь действий уже подготовлены, но состояние остаётся read-only до закрытия всех security-gates.'}
              </p>
              {!ownerActions.ready ? (
                <div className="owner-action-readiness">
                  <span className={ownerAuth.required ? 'is-done' : ''}>Обязательный вход</span>
                  <span className={ownerAuth.allowlistConfigured ? 'is-done' : ''}>Allowlist владельца</span>
                  <span className={ownerActions.serviceRoleConfigured ? 'is-done' : ''}>Server executor</span>
                  <span className={ownerActions.actionSwitchEnabled ? 'is-done' : ''}>Owner actions switch</span>
                </div>
              ) : null}
              {ownerActions.blockers.length ? (
                <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '12px' }}>
                  <summary>
                    <span><strong>Что ещё закрыть</strong><small>Без этого кнопки записи не активируются</small></span>
                    <span className="owner-section-kicker">{ownerActions.blockers.length}</span>
                  </summary>
                  <div className="owner-disclosure-body">
                    <ul className="owner-action-blockers">
                      {ownerActions.blockers.map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </details>
              ) : null}
            </article>

            <article className={`owner-card ${actions.available ? 'is-success' : 'is-warning'}`}>
              <div className={`owner-status ${actions.available ? 'is-success' : 'is-warning'}`}>
                {actions.available ? 'Есть доступные действия' : 'Автодействия закрыты'}
              </div>
              <h3 className="owner-card-title" style={{ marginTop: '10px' }}>Внешнее выполнение</h3>
              <p className="owner-card-copy">
                {actions.available
                  ? 'Есть действия, которые контролируемый шлюз выполнения считает доступными. Перед любым изменением рабочих данных всё равно проверяются класс одобрения и квитанция выполнения.'
                  : 'Система умеет рассчитывать, проверять и готовить решения, но не должна изображать внешнее выполнение, пока исполнитель, одобрения и журнал результата не готовы.'}
              </p>
            </article>
          </div>

          <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '10px' }} open={ownerActionAudit.length > 0}>
            <summary>
              <span><strong>Журнал защищённых действий владельца</strong><small>Решение, review или стратегическое действие; не смешивается с Execution Receipt</small></span>
              <span className="owner-section-kicker">{ownerActionAudit.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              {ownerActionAudit.length ? (
                <div className="owner-list">
                  {ownerActionAudit.map((row) => (
                    <article className="owner-list-row" key={String(row.owner_action_audit_id)}>
                      <div className="owner-list-row-main">
                        <div className="owner-card-meta">
                          <span className="owner-status is-info">{String(row.decision_code || 'RECORDED')}</span>
                          <span>{String(row.entity_type || 'OWNER_ACTION')}</span>
                        </div>
                        <h3>{String(row.action_code || 'Действие владельца')}</h3>
                        <p>{String(row.reason || 'Причина не зафиксирована.')}</p>
                      </div>
                      <div className="owner-list-row-side">
                        <span className="owner-section-kicker">{row.created_at ? new Date(String(row.created_at)).toLocaleString('ru-RU') : 'время не указано'}</span>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <p className="owner-card-copy">Защищённых owner-write действий пока не выполнялось. Это соответствует текущему locked состоянию UX-5.</p>
              )}
            </div>
          </details>
        </section>

        <section className="owner-section" id="ai-usage">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span>
                <strong>Использование ИИ</strong>
                <small>Последние 30 дней · раскрывать только когда нужен контроль стоимости или качества учёта</small>
              </span>
              <span className="owner-section-kicker">
                {aiUsage.invocations ? `${aiUsage.invocations} вызовов` : 'вызовов пока нет'}
              </span>
            </summary>

            <div className="owner-disclosure-body">
              <div className="owner-summary-strip">
                <div className="owner-summary-cell">
                  <strong>{aiUsage.invocations}</strong>
                  <span>вызовов ИИ</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>{aiUsage.meteredInvocations}</strong>
                  <span>вызовов учтено полностью</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>{aiUsage.avgLatencyMs == null ? '—' : `${Math.round(aiUsage.avgLatencyMs)} мс`}</strong>
                  <span>средняя задержка</span>
                </div>
                <div className="owner-summary-cell">
                  <strong>{aiUsage.unmeteredInvocations}</strong>
                  <span>вызовов без полного учёта</span>
                </div>
              </div>

              <div className={`owner-card ${aiUsage.unmeteredInvocations ? 'is-warning' : aiUsage.invocations ? 'is-success' : 'is-info'}`} style={{ marginTop: '10px' }}>
                <div className={`owner-status ${aiUsage.unmeteredInvocations ? 'is-warning' : aiUsage.invocations ? 'is-success' : 'is-info'}`}>
                  {aiUsage.unmeteredInvocations
                    ? `Нужно проверить учёт: ${aiUsage.unmeteredInvocations}`
                    : aiUsage.invocations
                      ? 'Учёт ИИ-операций работает'
                      : 'Живых вызовов ИИ пока нет'}
                </div>
                <p className="owner-card-copy">
                  {aiUsage.invocations
                    ? `Последний вызов: ${aiUsage.lastInvocationAt ? new Date(aiUsage.lastInvocationAt).toLocaleString('ru-RU') : 'не определён'}. Технический расход: ${new Intl.NumberFormat('ru-RU').format(aiUsage.totalTokens)} токенов всего (${new Intl.NumberFormat('ru-RU').format(aiUsage.inputTokens)} вход / ${new Intl.NumberFormat('ru-RU').format(aiUsage.outputTokens)} выход).`
                    : 'Это правильное состояние до запуска автоматических рабочих потоков. FEYA не должна тратить ресурсы только ради видимости «активных агентов».'}
                </p>
              </div>
            </div>
          </details>
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
