import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SourceOfTruthRegistryRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSources(): Promise<{ rows: SourceOfTruthRegistryRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_source_of_truth_registry_safe_v1')
    .select('*')
    .order('precedence', { ascending: false })
    .order('source_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as SourceOfTruthRegistryRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE') return 'danger';
  return 'warning';
}

function tierClass(value: unknown) {
  const tier = asText(value, '').toUpperCase();
  if (tier === 'CURRENT_FIRST_PARTY') return 'ok';
  if (tier === 'DERIVED_OPERATIONAL') return 'warning';
  return 'badge';
}

export default async function AdminDataAuthorityPage() {
  const { rows, error } = await getSources();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/data-authority">Data Authority</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/metrics">Metrics</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Source-of-Truth Registry · read-only</div>
          <h1>Data Authority</h1>
          <p>
            Growth OS distinguishes authoritative first-party truth, legacy evidence, external market data and derived operational signals. Derived/legacy data cannot silently override a higher-authority source.
          </p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Domain</th>
                <th>Authority</th>
                <th>State</th>
                <th>Owner</th>
                <th>Primary source</th>
                <th>Precedence</th>
                <th>Limitation</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source_code}>
                  <td>
                    <strong>{asText(row.source_name, row.source_code)}</strong>
                    <div className="muted">{asText(row.authority_domain)}</div>
                    <div className="muted">{row.source_code}</div>
                  </td>
                  <td>
                    <span className={tierClass(row.authority_tier)}>
                      {asText(row.authority_tier)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${stateClass(row.source_state)}`}>
                      {asText(row.source_state)}
                    </span>
                    <div className="muted">{asText(row.implementation_state)}</div>
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>{asText(row.primary_source)}</td>
                  <td>{row.precedence ?? '—'}</td>
                  <td>
                    {asText(row.public_summary)}
                    <div className="muted">{asText(row.limitations_summary)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
