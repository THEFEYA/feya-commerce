import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { RoleActivationRow } from '@/lib/types';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

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

function autonomyLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'OBSERVE_ONLY') return 'Только наблюдение';
  if (key === 'PROPOSE_ONLY') return 'Может предлагать';
  if (key === 'SHADOW_ACTIONS') return 'Безопасный режим действий';
  if (key === 'CONTROLLED_ACTIONS') return 'Разрешённые действия под контролем';
  return asText(value);
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
            <Link href="/admin/roles">Роли</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Команда FEYA · только просмотр</div>
          <h1>Роли AI-команды</h1>
          <p>
            Наличие роли в архитектуре не означает, что агент сейчас активен. Здесь показано реальное состояние роли и предел её самостоятельности.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Всего ролей</span></div>
          <div className="card metric"><strong>{active}</strong><span>Активны</span></div>
          <div className="card metric"><strong>{shadow}</strong><span>Режим наблюдения</span></div>
          <div className="card metric"><strong>{inactive}</strong><span>Не активированы</span></div>
          <div className="card metric"><strong>{paused}</strong><span>Приостановлены</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Роль</th>
                <th>Состояние</th>
                <th>Предел самостоятельности</th>
                <th>Нужно возможностей</th>
                <th>Полностью готовы</th>
                <th>Заблокировано</th>
                <th>Разрешено действий</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.role_code}>
                  <td>
                    <strong>{roleLabel(row.role_code)}</strong>
                    <div className="muted">{row.role_code} · {asText(row.role_type)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${statusClass(row.runtime_status)}`}>
                      {asText(row.runtime_status)}
                    </span>
                  </td>
                  <td>{autonomyLabel(row.autonomy_ceiling)}</td>
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
