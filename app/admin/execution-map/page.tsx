import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthActionCapabilityRow } from '@/lib/types';
import { implementationStateLabel, roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getActions(): Promise<{ rows: GrowthActionCapabilityRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_action_capability_safe_v1')
    .select('*')
    .order('action_state', { ascending: true })
    .order('action_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as GrowthActionCapabilityRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

const ACTION_LABELS: Record<string, string> = {
  ACTIVATE_GROWTH_OBJECTIVE: 'Активировать цель роста',
  ACTIVATE_GROWTH_STRATEGY: 'Активировать версию стратегии',
  ADMIT_SIGNAL: 'Передать сигнал в работу или владельцу',
  ADOPT_LEARNING_POLICY: 'Принять правило из подтверждённого вывода',
  APPLY_INDEXABILITY_PROPOSAL: 'Применить решение по индексации',
  APPLY_KEYWORD_CLEANUP_HUMAN_REVIEW: 'Применить решение по очистке ключа',
  APPLY_PAGE_OWNERSHIP_PROPOSAL: 'Назначить страницу основной для запросов',
  APPLY_QUERY_CLUSTER_PROPOSAL: 'Применить группу запросов',
  APPROVE_EXECUTION_REQUEST: 'Одобрить запрос на выполнение',
  BEGIN_EXECUTION_REQUEST: 'Начать одобренное выполнение',
  CHANGE_PRICE: 'Изменить публичную цену',
  CLAIM_WORKFLOW_RUN: 'Забрать готовую задачу в фоновую обработку',
  COMPLETE_GROWTH_HANDOFF: 'Завершить передачу рабочей ситуации',
  CREATE_EXECUTION_REQUEST: 'Создать запрос на выполнение',
  CREATE_EXPERIMENT: 'Создать эксперимент',
  CREATE_GROWTH_EVENT: 'Создать событие роста',
  CREATE_GROWTH_HANDOFF: 'Передать рабочую ситуацию другой роли',
  CREATE_GROWTH_OPPORTUNITY: 'Создать возможность роста',
  CREATE_GROWTH_STRATEGY_VERSION: 'Создать черновик стратегии',
  CREATE_INCIDENT: 'Создать инцидент',
  CREATE_STABILIZATION_WINDOW: 'Создать защитное окно после изменения',
  CREATE_WORKFLOW_RUN: 'Создать долговременный рабочий процесс',
  DIRECTOR_GATE_INITIATIVE: 'Проверить инициативу директором по росту',
  ENABLE_SEARCH_INDEXING: 'Включить поисковую индексацию',
  ENQUEUE_EXPIRING_OPPORTUNITIES: 'Поставить истекающие возможности в очередь',
  HARDEN_ADMIN_DATA_BOUNDARY: 'Закрыть прямой доступ к внутренним данным',
  HUMAN_APPROVE_INITIATIVE: 'Подтвердить инициативу владельцем',
  PREPARE_POLICY_CANDIDATE: 'Подготовить кандидат в правило',
  PUBLISH_CONTENT: 'Опубликовать контент на витрине',
  RECORD_DATA_SOURCE_HEALTH: 'Записать состояние источника данных',
  RECORD_EXPERIMENT_CONTAMINATION: 'Зафиксировать влияющее изменение эксперимента',
  RECORD_INDEXABILITY_PROPOSAL: 'Записать предложение по индексации',
  RECORD_LEARNING_EVIDENCE: 'Добавить доказательство к выводу',
  RECORD_SCENARIO_RUN: 'Записать результат регрессионной проверки',
  REVALIDATE_INITIATIVE_STRATEGY: 'Повторно проверить инициативу после смены стратегии',
  REVIEW_INDEXABILITY_PROPOSAL: 'Проверить предложение по индексации',
  REVIEW_PAGE_OWNERSHIP_PROPOSAL: 'Проверить ответственность страницы',
  REVIEW_QUERY_CLUSTER_PROPOSAL: 'Проверить группу запросов',
  REVIEW_SCO_SHADOW_DRAFT: 'Проверить SEO-черновик человеком',
  RUN_CONTENT_PRECHECKS: 'Запустить автоматические проверки контента',
  RUN_INDEPENDENT_CQA: 'Запустить независимый контроль качества',
  RUN_KEYWORD_CLEANUP: 'Запустить очистку SEO-ключей',
  RUN_KEYWORD_CLEANUP_REVIEW: 'Запустить независимую проверку очистки ключей',
  RUN_PAGE_OWNERSHIP_PROPOSALS: 'Сформировать предложения ответственности страниц',
  RUN_QUERY_CLUSTER_PROPOSALS: 'Сформировать предложения групп запросов',
  RUN_SCO_SHADOW: 'Подготовить SEO-контент в безопасном режиме',
  SET_EXPERIMENT_FEASIBILITY: 'Оценить реализуемость эксперимента',
  SET_OBJECTIVE_FEASIBILITY: 'Оценить реализуемость цели',
  SET_ROLE_RUNTIME_STATUS: 'Изменить рабочий статус роли',
  START_EXPERIMENT: 'Начать окно наблюдения эксперимента',
  TRANSITION_GROWTH_CASE: 'Перевести рабочую ситуацию на следующий этап',
  TRANSITION_INCIDENT: 'Перевести инцидент на следующий этап',
  UPDATE_CANONICAL: 'Изменить canonical страницы',
  UPDATE_CONTENT_DRAFT: 'Обновить канонический черновик контента',
};

function actionLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  return ACTION_LABELS[key] || 'Системное действие';
}

function actionClassLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    HUMAN_ACTION: 'Только человек',
    AGENT_ASSISTED: 'ИИ помогает, действие контролируется',
    AUTO_ALLOWED: 'Можно автоматизировать при готовности',
    EXECUTABLE_WITH_APPROVAL: 'Выполняется только после одобрения',
  };
  return labels[key] || 'Ограниченное действие';
}

function executorLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    SERVER_RPC: 'Защищённый серверный вызов',
    INTERNAL_API: 'Внутренний API',
    EXECUTION_GATEWAY: 'Контролируемый шлюз выполнения',
    EXECUTION_DISPATCHER: 'Внешний исполнитель',
    WORKFLOW_WORKER: 'Фоновый процесс',
    DEPLOYMENT_ENV: 'Настройка развёртывания',
    HUMAN_OR_COMMERCE_TOOL: 'Человек / commerce-инструмент',
  };
  return labels[key] || (key ? 'Системный исполнитель' : 'Не назначен');
}

function approvalLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (!key || key === 'NONE') return 'Отдельное одобрение не требуется';
  if (key.includes('HUMAN_OWNER')) return 'Требуется решение владельца';
  if (key.includes('HUMAN')) return 'Требуется человек';
  if (key.includes('DIRECTOR')) return 'Требуется проверка директора по росту';
  if (key.includes('DRY_RUN')) return 'Без одобрения только в тестовом режиме';
  if (key.includes('POLICY')) return 'Зависит от правила и риска';
  if (key.includes('INTERNAL_TOKEN')) return 'Только внутренний защищённый вызов';
  return 'Контролируемое одобрение';
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE') return 'danger';
  return 'warning';
}

export default async function AdminExecutionMapPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string; approval?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getActions();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention').toUpperCase();
  const approvalFilter = String(params.approval || 'all').toLowerCase();
  const available = rows.filter((row) => row.action_state === 'AVAILABLE').length;
  const limited = rows.filter((row) => row.action_state === 'AVAILABLE_WITH_LIMITATIONS').length;
  const unavailable = rows.filter((row) => row.action_state === 'UNAVAILABLE').length;
  const ownerRequired = rows.filter((row) => String(row.approval_class || '').includes('HUMAN')).length;
  const productionWrites = rows.filter((row) => row.production_mutation === true).length;
  const unavailableRows = rows.filter((row) => row.action_state === 'UNAVAILABLE');
  const humanApprovalRows = rows.filter((row) => String(row.approval_class || '').includes('HUMAN'));

  const filteredRows = rows
    .filter((row) => {
      const haystack = [actionLabel(row.action_code), roleLabel(row.owner_role), row.action_code]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const state = String(row.action_state || '').toUpperCase();
      const approval = String(row.approval_class || '').toUpperCase();
      const matchesState =
        stateFilter === 'ALL' ||
        (stateFilter === 'ATTENTION' && (state !== 'AVAILABLE' || approval.includes('HUMAN'))) ||
        state === stateFilter;
      const matchesApproval =
        approvalFilter === 'all' ||
        (approvalFilter === 'human' && approval.includes('HUMAN')) ||
        (approvalFilter === 'none' && (!approval || approval === 'NONE' || approval.includes('NONE_FOR')));
      return matchesQuery && matchesState && matchesApproval;
    })
    .sort((a, b) => {
      const attentionRank = (row: GrowthActionCapabilityRow) => {
        const state = String(row.action_state || '').toUpperCase();
        const approval = String(row.approval_class || '').toUpperCase();
        if (state === 'UNAVAILABLE') return 0;
        if (approval.includes('HUMAN_OWNER')) return 1;
        if (approval.includes('HUMAN')) return 2;
        if (state === 'AVAILABLE_WITH_LIMITATIONS') return 3;
        return 4;
      };
      return attentionRank(a) - attentionRank(b) || actionLabel(a.action_code).localeCompare(actionLabel(b.action_code), 'ru');
    });

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · права и автоматизация</div>
            <h1>Что FEYA может делать</h1>
            <p>Разделяем возможность анализировать, готовить предложение и реально менять рабочие данные. Недоступное действие система не должна имитировать, а одобрение не считается выполнением.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system#permissions" className="owner-button">Назад к системе</Link>
            <Link href="/admin/executions" className="owner-button">История выполнения</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Действий пока недоступны</span></div>
          <div className="owner-summary-cell"><strong>{ownerRequired}</strong><span>Требуют человека / владельца</span></div>
          <div className="owner-summary-cell"><strong>{productionWrites}</strong><span>Могут менять рабочие данные</span></div>
          <div className="owner-summary-cell"><strong>{available + limited}</strong><span>Имеют реализованный путь с ограничениями</span></div>
        </section>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что нельзя выполнить сейчас</h2>
              <div className="owner-section-kicker">Только реальные недоступные действия — без стены из полного технического реестра</div>
            </div>
          </div>
          {unavailableRows.length ? (
            <div className="owner-grid two">
              {unavailableRows.map((row) => (
                <article className="owner-card is-danger" key={row.action_code}>
                  <div className="owner-card-meta">
                    <span className="owner-status is-danger">Недоступно</span>
                    <span>{roleLabel(row.owner_role)}</span>
                  </div>
                  <h3 className="owner-card-title">{actionLabel(row.action_code)}</h3>
                  <p className="owner-card-copy">{asText(row.limitations_summary, 'Исполнительный путь ещё не готов.')}</p>
                  <div className="owner-card-meta" style={{ marginTop: '12px', marginBottom: 0 }}>
                    <span>{approvalLabel(row.approval_class)}</span>
                    {row.production_mutation === true ? <span>меняет рабочие данные</span> : null}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-card is-success"><div className="owner-status is-success">Недоступных действий нет</div><p className="owner-card-copy">Все зарегистрированные действия имеют хотя бы ограниченный путь выполнения.</p></div>
          )}
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Действия, где нужен человек</strong><small>Самостоятельность FEYA заканчивается на этой границе</small></span>
              <span className="owner-section-kicker">{humanApprovalRows.length}</span>
            </summary>
            <div className="owner-disclosure-body owner-list">
              {humanApprovalRows.map((row) => (
                <article className="owner-list-row" key={row.action_code}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-warning">{approvalLabel(row.approval_class)}</span>
                      <span>{roleLabel(row.owner_role)}</span>
                    </div>
                    <h3>{actionLabel(row.action_code)}</h3>
                    <p>{asText(row.limitations_summary, 'После одобрения всё равно требуется отдельное контролируемое выполнение.')}</p>
                  </div>
                  <div className="owner-list-row-side">
                    {row.production_mutation === true ? <span className="owner-status is-danger">изменяет данные</span> : <span className="owner-section-kicker">без прямой записи</span>}
                  </div>
                </article>
              ))}
            </div>
          </details>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полная карта действий</strong><small>Поиск, фильтры, исполнитель и технические ограничения</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <form action="/admin/execution-map" className="owner-card" style={{ marginBottom: '14px' }}>
                <div className="grid gap-3 lg:grid-cols-[1fr_250px_240px_auto] lg:items-end">
                  <label>
                    <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск действия</div>
                    <input name="q" defaultValue={q} className="field" placeholder="индексация, цена, контент…" />
                  </label>
                  <label>
                    <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
                    <select name="state" defaultValue={stateFilter} className="field">
                      <option value="ATTENTION">Требует внимания</option>
                      <option value="UNAVAILABLE">Недоступно</option>
                      <option value="AVAILABLE_WITH_LIMITATIONS">Доступно с ограничениями</option>
                      <option value="AVAILABLE">Доступно полностью</option>
                      <option value="ALL">Все</option>
                    </select>
                  </label>
                  <label>
                    <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Одобрение</div>
                    <select name="approval" defaultValue={approvalFilter} className="field">
                      <option value="all">Любое</option>
                      <option value="human">Нужен человек / владелец</option>
                      <option value="none">Без отдельного одобрения</option>
                    </select>
                  </label>
                  <button type="submit" className="owner-button primary">Применить</button>
                </div>
                <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
                  <span>Показано: {filteredRows.length}</span>
                  <span>Всего действий: {rows.length}</span>
                  <Link href="/admin/execution-map">Сбросить</Link>
                </div>
              </form>

              <div className="table-wrap">
                <table>
                  <thead><tr><th>Действие</th><th>Ответственный</th><th>Состояние</th><th>Исполнитель</th><th>Одобрение</th><th>Запись</th><th>Ограничения</th></tr></thead>
                  <tbody>
                    {filteredRows.map((row) => (
                      <tr key={row.action_code}>
                        <td><strong title={asText(row.action_code)}>{actionLabel(row.action_code)}</strong></td>
                        <td>{roleLabel(row.owner_role)}</td>
                        <td>{statusLabel(row.action_state)}<div className="muted">{implementationStateLabel(row.implementation_state)}</div></td>
                        <td>{executorLabel(row.executor_type)}</td>
                        <td>{approvalLabel(row.approval_class)}</td>
                        <td>{row.production_mutation === true ? 'Меняет рабочие данные' : 'Без прямой записи'}</td>
                        <td>{asText(row.limitations_summary)}</td>
                      </tr>
                    ))}
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
