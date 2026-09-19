import Link from 'next/link';
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

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'SUCCEEDED') return 'ok';
  if (status === 'FAILED' || status === 'STALE' || status === 'CANCELLED') return 'danger';
  return 'warning';
}

export default async function AdminExecutionsPage() {
  const { rows, error } = await getRows();

  const approvalRequired = rows.filter((row) => row.request_status === 'APPROVAL_REQUIRED').length;
  const approved = rows.filter((row) => row.request_status === 'APPROVED').length;
  const executing = rows.filter((row) => row.request_status === 'EXECUTING').length;
  const succeeded = rows.filter((row) => row.request_status === 'SUCCEEDED').length;
  const failed = rows.filter((row) => row.request_status === 'FAILED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/execution-map">Права действий</Link>
            <Link href="/admin/executions">Выполнение</Link>
            <Link href="/admin/incidents">Инциденты</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Шлюз выполнения · только просмотр</div>
          <h1>Запросы на выполнение</h1>
          <p>
            Здесь видны неизменяемые запросы, одобрения и квитанции выполнения. Универсальный исполнитель пока не включён, поэтому одобренный запрос не означает автоматическое выполнение.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{approvalRequired}</strong><span>Требуют одобрения</span></div>
          <div className="owner-summary-cell"><strong>{approved}</strong><span>Одобрены, ждут исполнителя</span></div>
          <div className="owner-summary-cell"><strong>{executing}</strong><span>Выполняются сейчас</span></div>
          <div className="owner-summary-cell"><strong>{failed}</strong><span>Завершились ошибкой</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">Реальных запросов на выполнение пока нет.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Запрос</th>
                  <th>Действие</th>
                  <th>Статус</th>
                  <th>Одобрение</th>
                  <th>Область изменений</th>
                  <th>Последняя квитанция</th>
                  <th>Ошибка</th>
                  <th>Создан</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.execution_request_id}>
                    <td>
                      <strong title={asText(row.execution_request_id)}>{asText(row.request_code, 'Запрос на выполнение')}</strong>
                    </td>
                    <td>
                      <span title={`${asText(row.action_code)} · ${asText(row.action_class)} · ${asText(row.executor_type)}`}>{requestActionLabel(row.action_code)}</span>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(row.request_status)}`}>
                        {statusLabel(row.request_status)}
                      </span>
                    </td>
                    <td>
                      <span title={asText(row.approval_class)}>{approvalLabel(row.approval_class)}</span>
                      <div className="muted">{row.has_approval_user ? 'одобрение зафиксировано' : 'одобрение ещё не зафиксировано'}</div>
                    </td>
                    <td>{asText(row.mutation_domain)}</td>
                    <td>
                      {row.latest_receipt_id ? (
                        <>
                          <span className={`status-pill ${statusClass(row.latest_receipt_status)}`}>
                            {asText(row.latest_receipt_status)}
                          </span>
                          <div className="muted" title={asText(row.latest_executor_id)}>попытка {row.latest_attempt_no ?? '—'}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>{row.latest_error_message ? <details><summary className="cursor-pointer text-[var(--gold-warm)]">Показать ошибку</summary><div className="muted" style={{ marginTop: '6px' }} title={asText(row.latest_error_code)}>{asText(row.latest_error_message)}</div></details> : '—'}</td>
                    <td>{dateTimeLabel(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
