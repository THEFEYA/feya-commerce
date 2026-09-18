import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { RoleActivationRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: RoleActivationRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_role_activation_safe_v1')
    .select('*')
    .order('role_type', { ascending: true })
    .order('role_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as RoleActivationRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function statusClass(value: unknown) {
  const status = asText(value, '').toUpperCase();
  if (status === 'ACTIVE') return 'ok';
  if (status === 'INACTIVE') return 'danger';
  return 'warning';
}

export default async function AdminRolesPage() {
  const { rows, error } = await getRows();

  const active = rows.filter((row) => row.runtime_status === 'ACTIVE').length;
  const shadow = rows.filter((row) => row.runtime_status === 'SHADOW').length;
  const inactive = rows.filter((row) => row.runtime_status === 'INACTIVE').length;
  const paused = rows.filter((row) => row.runtime_status === 'PAUSED').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/roles">Roles</Link>
            <Link href="/admin/system-readiness">System Readiness</Link>
            <Link href="/admin/execution-map">Execution Map</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Role Activation Gate · read-only</div>
          <h1>Agent Runtime Roles</h1>
          <p>
            A logical role existing in the architecture does not mean an agent is active. Runtime status and autonomy ceiling are explicit and capability-gated.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Logical roles</span></div>
          <div className="card metric"><strong>{active}</strong><span>ACTIVE</span></div>
          <div className="card metric"><strong>{shadow}</strong><span>SHADOW</span></div>
          <div className="card metric"><strong>{inactive}</strong><span>INACTIVE</span></div>
          <div className="card metric"><strong>{paused}</strong><span>PAUSED</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Role</th>
                <th>Runtime</th>
                <th>Autonomy ceiling</th>
                <th>Required capabilities</th>
                <th>Fully available</th>
                <th>Blocked</th>
                <th>Allowed actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.role_code}>
                  <td>
                    <strong>{asText(row.role_name, row.role_code)}</strong>
                    <div className="muted">{row.role_code} · {asText(row.role_type)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.runtime_status)}`}>
                      {asText(row.runtime_status)}
                    </span>
                  </td>
                  <td>{asText(row.autonomy_ceiling)}</td>
                  <td>{row.required_capability_count ?? 0}</td>
                  <td>{row.fully_available_capability_count ?? 0}</td>
                  <td>{row.blocked_capability_count ?? 0}</td>
                  <td>{row.allowed_action_count ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
