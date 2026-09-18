import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { DataSourceHealthRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: DataSourceHealthRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_data_source_health_latest_safe_v1')
    .select('*')
    .order('source_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as DataSourceHealthRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function healthClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'HEALTHY') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE') return 'danger';
  return 'warning';
}

export default async function AdminDataHealthPage() {
  const { rows, error } = await getRows();

  const healthy = rows.filter((row) => row.health_state === 'HEALTHY').length;
  const degraded = rows.filter((row) => row.health_state === 'DEGRADED').length;
  const unavailable = rows.filter((row) => row.health_state === 'UNAVAILABLE').length;
  const notObservable = rows.filter((row) => row.health_state === 'NOT_OBSERVABLE').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/data-authority">Data Authority</Link>
            <Link href="/admin/data-health">Data Health</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Data freshness & health · latest snapshot</div>
          <h1>Data Health</h1>
          <p>
            Authority and availability are separate from freshness. Missing or stale sources remain explicit and must not be interpreted as zero business activity.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Sources</span></div>
          <div className="card metric"><strong>{healthy}</strong><span>Healthy</span></div>
          <div className="card metric"><strong>{degraded}</strong><span>Degraded</span></div>
          <div className="card metric"><strong>{unavailable}</strong><span>Unavailable</span></div>
          <div className="card metric"><strong>{notObservable}</strong><span>Not observable</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          This is an append-only audit snapshot. No automatic health scheduler is deployed yet, so checked_at matters.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Source</th>
                <th>Authority</th>
                <th>Health</th>
                <th>Freshness</th>
                <th>Watermark</th>
                <th>Rows</th>
                <th>Error / limitation</th>
                <th>Checked</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                  <td>
                    <strong>{asText(row.source_name, row.source_code)}</strong>
                    <div className="muted">{row.source_code}</div>
                    <div className="muted">{asText(row.source_instance_key)}</div>
                  </td>
                  <td>
                    {asText(row.authority_tier)}
                    <div className="muted">{asText(row.authority_domain)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${healthClass(row.health_state)}`}>
                      {asText(row.health_state)}
                    </span>
                  </td>
                  <td>{asText(row.freshness_state)}</td>
                  <td>{asText(row.watermark_at)}</td>
                  <td>{row.observed_row_count ?? '—'}</td>
                  <td>
                    {asText(row.error_code)}
                    <div className="muted">{asText(row.error_message)}</div>
                  </td>
                  <td>{asText(row.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
