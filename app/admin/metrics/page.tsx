import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthMetricRegistryRow, GrowthOperationalMetricRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getMetrics(): Promise<{
  registry: GrowthMetricRegistryRow[];
  values: GrowthOperationalMetricRow[];
  error?: string;
}> {
  const supabase = getAdminReadClient();
  if (!supabase) return { registry: [], values: [], error: getMissingAdminDataEnvMessage() };

  const [registryResult, valuesResult] = await Promise.all([
    supabase
      .from('feya_commerce_v_growth_metric_registry_safe_v1')
      .select('*')
      .order('metric_state', { ascending: true })
      .order('metric_code', { ascending: true }),
    supabase
      .from('feya_commerce_v_growth_operational_metrics_safe_v1')
      .select('*')
      .order('metric_code', { ascending: true }),
  ]);

  if (registryResult.error) return { registry: [], values: [], error: registryResult.error.message };
  if (valuesResult.error) return { registry: [], values: [], error: valuesResult.error.message };

  return {
    registry: (registryResult.data || []) as GrowthMetricRegistryRow[],
    values: (valuesResult.data || []) as GrowthOperationalMetricRow[],
  };
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

export default async function AdminMetricsPage() {
  const { registry, values, error } = await getMetrics();
  const valueMap = new Map(values.map((row) => [row.metric_code, row]));

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/metrics">Metrics</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Metric Registry · read-only</div>
          <h1>Growth Metrics</h1>
          <p>
            Metric definitions are versioned separately from agent prompts. Unavailable source systems remain unavailable instead of producing synthetic values.
          </p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Metric</th>
                <th>Current value</th>
                <th>Owner</th>
                <th>State</th>
                <th>Source / surface</th>
                <th>Definition</th>
                <th>Limitation</th>
              </tr>
            </thead>
            <tbody>
              {registry.map((row) => {
                const current = valueMap.get(row.metric_code);
                return (
                  <tr key={row.metric_code}>
                    <td>
                      <strong>{asText(row.metric_name, row.metric_code)}</strong>
                      <div className="muted">{row.metric_code}</div>
                    </td>
                    <td>
                      {current ? <strong>{asText(current.metric_value)} {asText(current.unit, '')}</strong> : '—'}
                    </td>
                    <td>{asText(row.owner_role)}</td>
                    <td>
                      <span className={`status-pill ${stateClass(row.metric_state)}`}>
                        {asText(row.metric_state)}
                      </span>
                    </td>
                    <td>
                      {asText(row.authority_source)}
                      <div className="muted">{asText(row.measurement_surface)}</div>
                    </td>
                    <td>{asText(row.public_summary)}</td>
                    <td>{asText(row.limitations_summary)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
