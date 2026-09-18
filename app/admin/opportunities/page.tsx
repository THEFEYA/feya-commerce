import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthOpportunityRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: GrowthOpportunityRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_opportunities_safe_v1')
    .select('*')
    .order('commercial_expiry_at', { ascending: true })
    .limit(300);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as GrowthOpportunityRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'CLOSED') return 'ok';
  if (status === 'EXPIRED' || status === 'CANCELLED' || status === 'EXPIRING_SOON') return 'danger';
  return 'warning';
}

export default async function AdminOpportunitiesPage() {
  const { rows, error } = await getRows();

  const expiringSoon = rows.filter((row) => row.expiry_state === 'EXPIRING_SOON').length;
  const thisWeek = rows.filter((row) => row.expiry_state === 'EXPIRING_THIS_WEEK').length;
  const expired = rows.filter((row) => row.opportunity_status === 'EXPIRED').length;
  const actioning = rows.filter((row) => row.opportunity_status === 'ACTIONING').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/opportunities">Opportunities</Link>
            <Link href="/admin/strategy">Strategy</Link>
            <Link href="/admin/signals">Signals</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Event / commercial deadline registry · read-only</div>
          <h1>Opportunities</h1>
          <p>
            Event dates and commercial deadlines are tracked separately. A seasonal event may still be weeks away while the practical production/shipping decision window has already expired.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Opportunities</span></div>
          <div className="card metric"><strong>{expiringSoon}</strong><span>Expiring ≤48h</span></div>
          <div className="card metric"><strong>{thisWeek}</strong><span>Expiring this week</span></div>
          <div className="card metric"><strong>{actioning}</strong><span>Actioning</span></div>
          <div className="card metric"><strong>{expired}</strong><span>Expired</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">No real Growth Opportunities have been recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Priority</th>
                  <th>Opportunity</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>Commercial expiry</th>
                  <th>Event window</th>
                  <th>Initiative</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.opportunity_id}>
                    <td>{asText(row.priority)}</td>
                    <td>
                      <strong>{asText(row.title, row.opportunity_code || '—')}</strong>
                      <div className="muted">{asText(row.opportunity_type)}</div>
                      <div className="muted">{asText(row.event_name)}</div>
                    </td>
                    <td>{asText(row.owner_role)}</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.opportunity_status)}`}>
                        {asText(row.opportunity_status)}
                      </span>
                      <div className="badge-row">
                        <span className={`status-pill ${statusClass(row.expiry_state)}`}>
                          {asText(row.expiry_state)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {asText(row.commercial_expiry_at)}
                      <div className="muted">due {asText(row.due_at)}</div>
                    </td>
                    <td>
                      {asText(row.event_starts_at)}
                      <div className="muted">→ {asText(row.event_ends_at)}</div>
                    </td>
                    <td>{asText(row.initiative_id)}</td>
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
