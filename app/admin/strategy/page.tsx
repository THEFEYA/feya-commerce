import Link from 'next/link';
import { OwnerInitiativeDrawerClient } from '@/components/admin/OwnerInitiativeDrawerClient';
import { OwnerObjectiveDrawerClient } from '@/components/admin/OwnerObjectiveDrawerClient';
import { OwnerStrategicActionClient } from '@/components/admin/OwnerStrategicActionClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import { getOwnerActionConfigStatus } from '@/lib/ownerActionAuth';
import type { GrowthInitiativeRow, GrowthObjectiveEventRow, GrowthObjectiveRow, GrowthStrategyRow } from '@/lib/types';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getData(): Promise<{
  strategies: GrowthStrategyRow[];
  objectives: GrowthObjectiveRow[];
  objectiveEvents: GrowthObjectiveEventRow[];
  initiatives: GrowthInitiativeRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { strategies: [], objectives: [], objectiveEvents: [], initiatives: [], error: getMissingAdminDataEnvMessage() };

  const [strategyResult, objectiveResult, objectiveEventResult, initiativeResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_strategy_safe_v1')
      .select('*')
      .order('strategy_code', { ascending: true })
      .order('version_no', { ascending: false }),
    supabase
      .from('feya_commerce_v_growth_objectives_safe_v1')
      .select('*')
      .order('updated_at', { ascending: false }),
    supabase
      .from('feya_commerce_v_growth_objective_events_safe_v1')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('feya_commerce_v_growth_initiatives_safe_v1')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(300),
  ]);

  const firstError = strategyResult.error || objectiveResult.error || objectiveEventResult.error || initiativeResult.error;
  if (firstError) return { strategies: [], objectives: [], objectiveEvents: [], initiatives: [], error: firstError.message };

  return {
    strategies: (strategyResult.data || []) as GrowthStrategyRow[],
    objectives: (objectiveResult.data || []) as GrowthObjectiveRow[],
    objectiveEvents: (objectiveEventResult.data || []) as GrowthObjectiveEventRow[],
    initiatives: (initiativeResult.data || []) as GrowthInitiativeRow[],
  };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function economicModeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    REVENUE: 'Выручка',
    REVENUE_GROWTH: 'Рост выручки',
    MARGIN: 'Маржинальность',
    PROFIT: 'Прибыль',
    TRAFFIC: 'Трафик',
    SEARCH_GROWTH: 'Рост органического поиска',
  };
  return labels[key] || (key ? 'Настраиваемый режим' : '—');
}

function actionClassLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    OBSERVE: 'Наблюдение',
    ANALYZE: 'Анализ',
    PROPOSE: 'Подготовить предложение',
    CONTENT: 'Контент',
    SEO: 'SEO',
    EXPERIMENT: 'Эксперимент',
    PRODUCTION_WRITE: 'Изменение рабочих данных',
  };
  return labels[key] || (key ? 'Рабочее действие' : '—');
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'ACTIVE' || status === 'APPROVED' || status === 'VALID' || status === 'COMPLETED') return 'ok';
  if (status === 'REJECTED' || status === 'CANCELLED' || status === 'REQUIRED' || status === 'BLOCKED') return 'danger';
  return 'warning';
}

export default async function AdminStrategyPage() {
  const { strategies, objectives, objectiveEvents, initiatives, error } = await getData();
  const ownerActions = getOwnerActionConfigStatus();

  const activeStrategies = strategies.filter((row) => row.strategy_status === 'ACTIVE').length;
  const activeObjectives = objectives.filter((row) => row.objective_status === 'ACTIVE').length;
  const proposedObjectives = objectives.filter((row) => ['DRAFT', 'PROPOSED', 'PENDING'].includes(String(row.objective_status || '').toUpperCase())).length;
  const objectiveEventsById = new Map<string, GrowthObjectiveEventRow[]>();
  objectiveEvents.forEach((event) => {
    const current = objectiveEventsById.get(event.objective_id) || [];
    current.push(event);
    objectiveEventsById.set(event.objective_id, current);
  });
  const revalidation = initiatives.filter((row) => row.strategy_revalidation_status === 'REQUIRED').length;
  const directorPending = initiatives.filter((row) => row.director_gate_status === 'PENDING').length;
  const humanPending = initiatives.filter((row) => row.human_approval_status === 'PENDING').length;

  const activeRows = strategies.filter((row) => row.strategy_status === 'ACTIVE');
  const draftStrategyRows = strategies.filter((row) => row.strategy_status === 'DRAFT');
  const activeStrategyVersionByCode = new Map(
    activeRows.map((row) => [String(row.strategy_code || ''), Number(row.version_no || 0)]),
  );
  const attentionInitiatives = initiatives.filter((row) =>
    row.human_approval_status === 'PENDING' ||
    row.director_gate_status === 'PENDING' ||
    row.strategy_revalidation_status === 'REQUIRED' ||
    row.initiative_status === 'BLOCKED'
  );
  const otherInitiatives = initiatives.filter((row) => !attentionInitiatives.includes(row));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Рост · стратегия</div>
            <h1>Стратегия и инициативы</h1>
            <p>Активировать стратегию может только человек. Инициатива не переходит к выполнению, пока не пройдены нужные проверки и подтверждения.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/opportunities" className="owner-button">Возможности</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{activeStrategies}</strong><span>Активных стратегий</span></div>
          <div className="owner-summary-cell"><strong>{humanPending}</strong><span>Инициатив ждут решения владельца</span></div>
          <div className="owner-summary-cell"><strong>{directorPending}</strong><span>Ждут проверки директора по росту</span></div>
          <div className="owner-summary-cell"><strong>{revalidation}</strong><span>Нужна повторная проверка стратегии</span></div>
        </section>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Активная стратегия</h2>
              <div className="owner-section-kicker">Только человечески активированная версия считается текущей</div>
            </div>
          </div>

          {activeRows.length ? (
            <div className="owner-grid two">
              {activeRows.map((row) => (
                <article className="owner-card is-success" key={row.strategy_version_id}>
                  <div className="owner-card-meta">
                    <span className="owner-status is-success">Активна</span>
                    <span>версия {row.version_no ?? '—'}</span>
                  </div>
                  <h3 className="owner-card-title">{asText(row.title, 'Стратегия роста')}</h3>
                  <p className="owner-card-copy">Экономический режим: {economicModeLabel(row.economic_mode)}.</p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>{asText(row.active_from, 'начало не указано')}</span>
                    <span>→ {asText(row.active_to, 'без даты окончания')}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-card is-warning">
              <div className="owner-status is-warning">Активная стратегия не зафиксирована</div>
              <p className="owner-card-copy">FEYA не должна самостоятельно выбирать или активировать стратегию владельца.</p>
            </div>
          )}
        </section>

        {draftStrategyRows.length ? (
          <section className="owner-section">
            <div className="owner-section-head">
              <div>
                <h2>Черновики стратегии</h2>
                <div className="owner-section-kicker">Только владелец может сделать черновик активной стратегией</div>
              </div>
            </div>
            <div className="owner-list">
              {draftStrategyRows.map((row) => (
                <article className="owner-list-row" key={row.strategy_version_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-warning">Черновик</span>
                      <span>v{row.version_no ?? '—'}</span>
                      <span>{economicModeLabel(row.economic_mode)}</span>
                    </div>
                    <h3>{asText(row.title, 'Стратегия роста')}</h3>
                    <p>Активация заменит текущую активную версию этого strategy code и может отправить незавершённые инициативы на revalidation.</p>
                  </div>
                  <div className="owner-list-row-side">
                    <OwnerStrategicActionClient
                      actionCode="ACTIVATE_GROWTH_STRATEGY"
                      entityId={row.strategy_version_id}
                      expectedState="DRAFT"
                      title={asText(row.title, 'Стратегия роста')}
                      enabled={ownerActions.ready}
                      blockers={ownerActions.blockers}
                      expectedActiveVersion={activeStrategyVersionByCode.get(String(row.strategy_code || '')) || 0}
                    />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Цели роста</h2>
              <div className="owner-section-kicker">Цель активируется человеком и задаёт измеримую рамку, в которой сигналы могут переходить в работу</div>
            </div>
          </div>

          {objectives.length ? (
            <>
              <div className="owner-queue-strip" style={{ marginBottom: '12px' }}>
                <div className="owner-queue-item is-static">
                  <span className="owner-queue-copy"><strong>Активные цели</strong><small>человечески активированы</small></span>
                  <b>{activeObjectives}</b>
                </div>
                <div className="owner-queue-item is-static">
                  <span className="owner-queue-copy"><strong>Черновики / предложения</strong><small>ещё не активны</small></span>
                  <b>{proposedObjectives}</b>
                </div>
                <div className="owner-queue-item is-static">
                  <span className="owner-queue-copy"><strong>Всего целей</strong><small>версионируемый реестр</small></span>
                  <b>{objectives.length}</b>
                </div>
                <div className="owner-queue-item is-static">
                  <span className="owner-queue-copy"><strong>События целей</strong><small>durable history</small></span>
                  <b>{objectiveEvents.length}</b>
                </div>
              </div>

              <div className="owner-list">
                {objectives.map((row) => (
                  <article className="owner-list-row" key={row.objective_id}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span className={`owner-status ${row.objective_status === 'ACTIVE' ? 'is-success' : row.objective_status === 'BLOCKED' ? 'is-danger' : 'is-warning'}`}>
                          {statusLabel(row.objective_status)}
                        </span>
                        <span>{roleLabel(row.owner_role)}</span>
                        <span>реализуемость: {statusLabel(row.feasibility_status)}</span>
                      </div>
                      <h3>{asText(row.title, 'Цель роста')}</h3>
                      <p>Основная метрика: {asText(row.primary_metric_code, 'не назначена')}. Стратегия: {asText(row.strategy_version_ref, 'не связана')}.</p>
                    </div>
                    <div className="owner-list-row-side">
                      <OwnerObjectiveDrawerClient
                        row={row}
                        events={objectiveEventsById.get(row.objective_id) || []}
                        showOwnerAction
                        actionEnabled={ownerActions.ready}
                        actionBlockers={ownerActions.blockers}
                      />
                    </div>
                  </article>
                ))}
              </div>
            </>
          ) : (
            <div className="owner-empty">
              Активных или черновых целей роста пока нет. Это соответствует текущему pre-launch состоянию: FEYA не создаёт цель только ради того, чтобы «разбудить» сигналы.
            </div>
          )}
        </section>

        <section className="owner-section">
          <div className="owner-section-head">
            <div>
              <h2>Требует внимания</h2>
              <div className="owner-section-kicker">Инициативы, которые не могут безопасно двигаться дальше без проверки</div>
            </div>
          </div>

          {attentionInitiatives.length ? (
            <div className="owner-list">
              {attentionInitiatives.map((row) => (
                <article className="owner-list-row" key={row.initiative_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${row.human_approval_status === 'PENDING' ? 'is-warning' : row.initiative_status === 'BLOCKED' ? 'is-danger' : 'is-info'}`}>
                        {row.human_approval_status === 'PENDING'
                          ? 'Нужно решение владельца'
                          : row.director_gate_status === 'PENDING'
                            ? 'Нужна проверка директора'
                            : row.strategy_revalidation_status === 'REQUIRED'
                              ? 'Повторная проверка стратегии'
                              : statusLabel(row.initiative_status)}
                      </span>
                      <span>{roleLabel(row.owner_role)}</span>
                      <span>{actionClassLabel(row.action_class)}</span>
                    </div>
                    <h3>{asText(row.title, 'Инициатива роста')}</h3>
                    <p>
                      Стратегия: версия {row.strategy_version_no ?? '—'}.
                      {row.due_at ? ` Срок: ${asText(row.due_at)}.` : ''}
                    </p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{statusLabel(row.initiative_status)}</span>
                    <OwnerInitiativeDrawerClient
                      row={row}
                      showOwnerAction
                      actionEnabled={ownerActions.ready}
                      actionBlockers={ownerActions.blockers}
                    />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Инициатив, которые сейчас требуют отдельного внимания владельца или директора, нет.</div>
          )}
        </section>

        {otherInitiatives.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Остальные инициативы</strong><small>Скрыты, пока не требуют решения или вмешательства</small></span>
                <span className="owner-section-kicker">{otherInitiatives.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-list">
                {otherInitiatives.map((row) => (
                  <article className="owner-list-row" key={row.initiative_id}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta"><span>{statusLabel(row.initiative_status)}</span><span>{roleLabel(row.owner_role)}</span></div>
                      <h3>{asText(row.title, 'Инициатива')}</h3>
                    </div>
                    <div className="owner-list-row-side"><OwnerInitiativeDrawerClient
                      row={row}
                      showOwnerAction
                      actionEnabled={ownerActions.ready}
                      actionBlockers={ownerActions.blockers}
                    /></div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Версии стратегии и полный реестр</strong><small>Техническая история и все статусы инициатив</small></span>
              <span className="owner-section-kicker">{strategies.length + initiatives.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap" style={{ marginBottom: '18px' }}>
                <table>
                  <thead><tr><th>Стратегия</th><th>Версия</th><th>Статус</th><th>Режим</th><th>Период</th></tr></thead>
                  <tbody>
                    {strategies.length ? strategies.map((row) => (
                      <tr key={row.strategy_version_id}>
                        <td><strong>{asText(row.title, row.strategy_code || '—')}</strong></td>
                        <td>v{row.version_no ?? '—'}</td>
                        <td>{statusLabel(row.strategy_status)}</td>
                        <td>{economicModeLabel(row.economic_mode)}</td>
                        <td>{asText(row.active_from)} → {asText(row.active_to)}</td>
                      </tr>
                    )) : <tr><td colSpan={5}>Версий стратегии пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Инициатива</th><th>Ответственный</th><th>Статус</th><th>Директор</th><th>Владелец</th><th>Стратегия</th></tr></thead>
                  <tbody>
                    {initiatives.length ? initiatives.map((row) => (
                      <tr key={row.initiative_id}>
                        <td><strong>{asText(row.title, row.initiative_code || '—')}</strong></td>
                        <td>{roleLabel(row.owner_role)}</td>
                        <td>{statusLabel(row.initiative_status)}</td>
                        <td>{statusLabel(row.director_gate_status)}</td>
                        <td>{statusLabel(row.human_approval_status)}</td>
                        <td>v{row.strategy_version_no ?? '—'}</td>
                      </tr>
                    )) : <tr><td colSpan={6}>Инициатив пока нет.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
