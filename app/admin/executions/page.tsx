import Link from 'next/link';
import { CircleAlert, ShieldCheck, Workflow } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerExecutionDrawerClient } from '@/components/admin/OwnerExecutionDrawerClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ExecutionGatewayRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: ExecutionGatewayRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_execution_gateway_safe_v1')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ExecutionGatewayRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function requestActionLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    ENABLE_SEARCH_INDEXING: 'Включить поисковую индексацию',
    PUBLISH_CONTENT: 'Опубликовать контент',
    CHANGE_PRICE: 'Изменить публичную цену',
    UPDATE_CANONICAL: 'Изменить canonical',
    UPDATE_CONTENT_DRAFT: 'Обновить SEO-черновик',
    HARDEN_ADMIN_DATA_BOUNDARY: 'Закрыть внутренние данные админки',
    APPLY_INDEXABILITY_PROPOSAL: 'Применить решение по индексации',
    APPLY_QUERY_CLUSTER_PROPOSAL: 'Применить группу запросов',
    APPLY_PAGE_OWNERSHIP_PROPOSAL: 'Назначить страницу запросам',
  };
  return labels[key] || 'Контролируемое системное действие';
}

function approvalLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key.includes('HUMAN_OWNER')) return 'Нужно решение владельца';
  if (key.includes('HUMAN')) return 'Нужно одобрение человека';
  if (key.includes('POLICY')) return 'Зависит от правила и риска';
  if (!key || key === 'NONE') return 'Отдельное одобрение не требуется';
  return 'Контролируемое одобрение';
}

function toneClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'SUCCEEDED') return 'is-success';
  if (status === 'FAILED' || status === 'STALE' || status === 'CANCELLED') return 'is-danger';
  if (status === 'EXECUTING' || status === 'RUNNING') return 'is-info';
  return 'is-warning';
}

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default async function AdminExecutionsPage() {
  const { rows, error } = await getRows();

  const approvalRequired = rows.filter((row) => row.request_status === 'APPROVAL_REQUIRED').length;
  const approved = rows.filter((row) => row.request_status === 'APPROVED').length;
  const executing = rows.filter((row) => row.request_status === 'EXECUTING').length;
  const succeeded = rows.filter((row) => row.request_status === 'SUCCEEDED').length;
  const failed = rows.filter((row) => row.request_status === 'FAILED').length;

  const attentionRows = rows.filter((row) => ['APPROVAL_REQUIRED', 'FAILED', 'STALE'].includes(String(row.request_status || '').toUpperCase()));
  const activeRows = rows.filter((row) => ['APPROVED', 'EXECUTING'].includes(String(row.request_status || '').toUpperCase()));
  const historyRows = rows.filter((row) => !attentionRows.includes(row) && !activeRows.includes(row));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Система · выполнение</div>
            <h1>Выполнение</h1>
            <p>Запрос, одобрение и фактическое выполнение — разные состояния. FEYA считает действие выполненным только после отдельной квитанции исполнителя.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system#permissions" className="owner-button">Назад к системе</Link>
            <Link href="/admin/execution-map" className="owner-button">Права действий</Link>
          </div>
        </header>

        <section className="owner-queue-strip" aria-label="Состояние выполнения" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Ждут одобрения</strong><small>approval required</small></span>
            <b>{approvalRequired}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><Workflow size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Одобрены</strong><small>ждут исполнителя</small></span>
            <b>{approved}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><Workflow size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Выполняются</strong><small>есть активное исполнение</small></span>
            <b>{executing}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Успешно</strong><small>есть подтверждение результата</small></span>
            <b>{succeeded}</b>
          </div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        {!error && rows.length === 0 ? (
          <div className="owner-result-empty-state">
            <span className="owner-result-empty-icon" aria-hidden="true"><Workflow size={20} strokeWidth={1.6} /></span>
            <div>
              <strong>Реальных запросов на выполнение пока нет</strong>
              <p>Это ожидаемое состояние до protected owner actions. FEYA не имитирует выполнение только потому, что action capability уже описана.</p>
            </div>
          </div>
        ) : null}

        {attentionRows.length ? (
          <section className="owner-section" style={{ marginTop: 0 }}>
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-attention" aria-hidden="true"><CircleAlert size={17} strokeWidth={1.7} /></span>
                <div><h2>Требует внимания</h2><div className="owner-section-kicker">Одобрение, ошибка или устаревший запрос</div></div>
              </div>
            </div>
            <div className="owner-list">
              {attentionRows.map((row) => (
                <article className="owner-list-row" key={row.execution_request_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(row.request_status)}`}>{statusLabel(row.request_status)}</span>
                      <span>{approvalLabel(row.approval_class)}</span>
                    </div>
                    <h3>{requestActionLabel(row.action_code)}</h3>
                    <p>
                      Область: {asText(row.mutation_domain, 'не указана')}.
                      {row.latest_error_message ? ` Последняя ошибка: ${row.latest_error_message}` : ''}
                    </p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{dateTimeLabel(row.created_at)}</span>
                    <OwnerExecutionDrawerClient row={row} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {activeRows.length ? (
          <section className="owner-section" style={!attentionRows.length ? { marginTop: 0 } : undefined}>
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-info" aria-hidden="true"><Workflow size={17} strokeWidth={1.7} /></span>
                <div><h2>В процессе</h2><div className="owner-section-kicker">Создание запроса и выполнение не смешиваются</div></div>
              </div>
            </div>
            <div className="owner-list">
              {activeRows.map((row) => (
                <article className="owner-list-row" key={row.execution_request_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${toneClass(row.request_status)}`}>{statusLabel(row.request_status)}</span>
                      <span>{approvalLabel(row.approval_class)}</span>
                    </div>
                    <h3>{requestActionLabel(row.action_code)}</h3>
                    <p>{row.latest_receipt_id ? `Последняя квитанция: ${statusLabel(row.latest_receipt_status)}.` : 'Квитанции выполнения пока нет.'}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <OwnerExecutionDrawerClient row={row} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {failed ? (
          <div className="owner-card is-danger" style={{ marginTop: '20px' }}>
            <div className="owner-status is-danger">Ошибок выполнения: {failed}</div>
            <p className="owner-card-copy">Ошибка выполнения не должна автоматически повторяться бесконечно. Причина и повторная попытка проверяются отдельно.</p>
          </div>
        ) : null}

        {historyRows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>История запросов</strong><small>Завершённые и прочие состояния</small></span>
                <span className="owner-section-kicker">{historyRows.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-list">
                {historyRows.map((row) => (
                  <article className="owner-list-row" key={row.execution_request_id}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta"><span>{statusLabel(row.request_status)}</span><span>{dateTimeLabel(row.created_at)}</span></div>
                      <h3>{requestActionLabel(row.action_code)}</h3>
                    </div>
                    <div className="owner-list-row-side"><OwnerExecutionDrawerClient row={row} /></div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        {rows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Технический реестр выполнения</strong><small>Request IDs, receipt status и executor details</small></span>
                <span className="owner-section-kicker">{rows.length}</span>
              </summary>
              <div className="owner-disclosure-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Действие</th><th>Статус</th><th>Одобрение</th><th>Область</th><th>Receipt</th><th>Создан</th></tr></thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.execution_request_id}>
                          <td><strong title={asText(row.action_code)}>{requestActionLabel(row.action_code)}</strong></td>
                          <td>{statusLabel(row.request_status)}</td>
                          <td>{approvalLabel(row.approval_class)}</td>
                          <td>{asText(row.mutation_domain)}</td>
                          <td>{row.latest_receipt_id ? statusLabel(row.latest_receipt_status) : '—'}</td>
                          <td>{dateTimeLabel(row.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}
