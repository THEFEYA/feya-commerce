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
            <Link href="/admin/execution-map">Execution Map</Link>
            <Link href="/admin/executions">Executions</Link>
            <Link href="/admin/incidents">Incidents</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Execution Gateway · read-only</div>
          <h1>Execution Requests</h1>
          <p>
            Immutable requests, approval hashes and receipts are visible here. The generic dispatcher is not implemented, so an APPROVED request does not execute automatically.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Requests</span></div>
          <div className="card metric"><strong>{approvalRequired}</strong><span>Approval required</span></div>
          <div className="card metric"><strong>{approved}</strong><span>Approved / waiting executor</span></div>
          <div className="card metric"><strong>{executing}</strong><span>Executing</span></div>
          <div className="card metric"><strong>{succeeded}</strong><span>Succeeded</span></div>
          <div className="card metric"><strong>{failed}</strong><span>Failed</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">No real Execution Gateway requests have been created.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Request</th>
                  <th>Action</th>
                  <th>Status</th>
                  <th>Approval</th>
                  <th>Mutation domain</th>
                  <th>Latest receipt</th>
                  <th>Error</th>
                  <th>Created</th>
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
                      <div className="muted">{row.has_approval_user ? 'human approval recorded' : 'no human approval record'}</div>
                    </td>
                    <td>{asText(row.mutation_domain)}</td>
                    <td>
                      {row.latest_receipt_id ? (
                        <>
                          <span className={`status-pill ${statusClass(row.latest_receipt_status)}`}>
                            {asText(row.latest_receipt_status)}
                          </span>
                          <div className="muted">attempt {row.latest_attempt_no ?? '—'} · {asText(row.latest_executor_id)}</div>
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
