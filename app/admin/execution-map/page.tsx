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
    WORKFLOW_WORKER: 'Фоновый worker',
    DEPLOYMENT_ENV: 'Настройка deployment',
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

export default async function AdminExecutionMapPage() {
  const { rows, error } = await getActions();
  const available = rows.filter((row) => row.action_state === 'AVAILABLE').length;
  const limited = rows.filter((row) => row.action_state === 'AVAILABLE_WITH_LIMITATIONS').length;
  const unavailable = rows.filter((row) => row.action_state === 'UNAVAILABLE').length;
  const ownerRequired = rows.filter((row) => String(row.approval_class || '').includes('HUMAN')).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/metrics">Метрики</Link>
            <Link href="/admin/execution-map">Права действий</Link>
            <Link href="/admin/executions">Выполнение</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Карта разрешённых действий · только просмотр</div>
          <h1>Права и автоматизация</h1>
          <p>
            Для каждого действия явно указано, кто его выполняет, требуется ли одобрение и может ли оно менять рабочие данные. Недоступное действие система не должна имитировать.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{available}</strong><span>Действий полностью доступны</span></div>
          <div className="owner-summary-cell"><strong>{limited}</strong><span>Доступны с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Пока недоступны</span></div>
          <div className="owner-summary-cell"><strong>{ownerRequired}</strong><span>Требуют решения человека / владельца</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Действие</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Класс</th>
                <th>Исполнитель</th>
                <th>Одобрение</th>
                <th>Изменение данных</th>
                <th>Ограничения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.action_code}>
                  <td>
                    <strong title={asText(row.action_code)}>{actionLabel(row.action_code)}</strong>
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${stateClass(row.action_state)}`}>
                      {statusLabel(row.action_state)}
                    </span>
                    <div className="muted" title={asText(row.implementation_state)}>{implementationStateLabel(row.implementation_state)}</div>
                  </td>
                  <td title={asText(row.action_class)}>{actionClassLabel(row.action_class)}</td>
                  <td title={asText(row.executor_type)}>{executorLabel(row.executor_type)}</td>
                  <td title={asText(row.approval_class)}>{approvalLabel(row.approval_class)}</td>
                  <td>
                    {row.production_mutation === true ? (
                      <span className="status-pill danger">Рабочие данные</span>
                    ) : row.production_mutation === false ? (
                      <span className="badge">Без записи в рабочие данные</span>
                    ) : '—'}
                    {row.dry_run_default ? <div className="badge-row"><span className="badge">по умолчанию тестовый режим</span></div> : null}
                  </td>
                  <td><details><summary className="cursor-pointer text-[var(--gold-warm)]">Подробнее</summary><div className="muted" style={{ marginTop: '6px' }}>{asText(row.limitations_summary)}</div></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
