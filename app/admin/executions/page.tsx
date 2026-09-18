import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ExecutionGatewayRow } from '@/lib/types';

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

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Запросов</span></div>
          <div className="card metric"><strong>{approvalRequired}</strong><span>Требуют одобрения</span></div>
          <div className="card metric"><strong>{approved}</strong><span>Одобрены и ждут исполнителя</span></div>
          <div className="card metric"><strong>{executing}</strong><span>Выполняются</span></div>
          <div className="card metric"><strong>{succeeded}</strong><span>Успешно</span></div>
          <div className="card metric"><strong>{failed}</strong><span>Ошибки</span></div>
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
                      <strong>{asText(row.request_code)}</strong>
                      <div className="muted">{row.execution_request_id}</div>
                    </td>
                    <td>
                      {asText(row.action_code)}
                      <div className="muted">{asText(row.action_class)} / {asText(row.executor_type)}</div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass(row.request_status)}`}>
                        {asText(row.request_status)}
                      </span>
                    </td>
                    <td>
                      {asText(row.approval_class)}
                      <div className="muted">{row.has_approval_user ? 'одобрение человека зафиксировано' : 'одобрение человека не зафиксировано'}</div>
                    </td>
                    <td>{asText(row.mutation_domain)}</td>
                    <td>
                      {row.latest_receipt_id ? (
                        <>
                          <span className={`status-pill ${statusClass(row.latest_receipt_status)}`}>
                            {asText(row.latest_receipt_status)}
                          </span>
                          <div className="muted">попытка {row.latest_attempt_no ?? '—'} · {asText(row.latest_executor_id)}</div>
                        </>
                      ) : '—'}
                    </td>
                    <td>
                      {asText(row.latest_error_code)}
                      <div className="muted">{asText(row.latest_error_message)}</div>
                    </td>
                    <td>{asText(row.created_at)}</td>
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
