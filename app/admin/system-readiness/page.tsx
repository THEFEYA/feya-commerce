import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { GrowthCapabilityStatusRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCapabilities(): Promise<{ rows: GrowthCapabilityStatusRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) return { rows: [], error: getMissingSupabaseEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_capability_status_safe_v1')
    .select('*')
    .order('capability_state', { ascending: true })
    .order('capability_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as GrowthCapabilityStatusRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE') return 'danger';
  return 'warning';
}

function countState(rows: GrowthCapabilityStatusRow[], state: string) {
  return rows.filter((row) => row.capability_state === state).length;
}

export default async function AdminSystemReadinessPage() {
  const { rows, error } = await getCapabilities();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/admin/seo-portfolio">SEO Portfolio</Link>
            <Link href="/admin/seo-clusters">Cluster Queue</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Growth OS capability registry · read-only</div>
          <h1>System Readiness</h1>
          <p>
            What FEYA Growth OS can actually observe or execute today. Missing integrations remain unavailable instead of being inferred by AI.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Capabilities registered</span></div>
          <div className="card metric"><strong>{countState(rows, 'AVAILABLE')}</strong><span>Available</span></div>
          <div className="card metric"><strong>{countState(rows, 'AVAILABLE_WITH_LIMITATIONS')}</strong><span>Available with limits</span></div>
          <div className="card metric"><strong>{countState(rows, 'DEGRADED')}</strong><span>Degraded</span></div>
          <div className="card metric"><strong>{countState(rows, 'UNAVAILABLE')}</strong><span>Unavailable</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Capability</th>
                <th>Owner</th>
                <th>State</th>
                <th>Implementation</th>
                <th>What exists</th>
                <th>Limitation / next gate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.capability_code}>
                  <td>
                    <strong>{asText(row.capability_name, row.capability_code)}</strong>
                    <div className="muted">{row.capability_code}</div>
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.capability_state)}`}>
                      {asText(row.capability_state)}
                    </span>
                  </td>
                  <td>{asText(row.implementation_state)}</td>
                  <td>{asText(row.public_summary)}</td>
                  <td>{asText(row.limitations_summary)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
