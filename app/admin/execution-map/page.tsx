import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthActionCapabilityRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getActions(): Promise<{ rows: GrowthActionCapabilityRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_growth_action_capability_safe_v1')
    .select('*')
    .order('action_state', { ascending: true })
    .order('action_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as GrowthActionCapabilityRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE') return 'danger';
  return 'warning';
}

export default async function AdminExecutionMapPage() {
  const { rows, error } = await getActions();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/metrics">Метрики</Link>
            <Link href="/admin/execution-map">Права действий</Link>
            <Link href="/admin/executions">Выполнение</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Карта разрешённых действий · только просмотр</div>
          <h1>Права и автоматизация</h1>
          <p>
            Для каждого действия явно указано, кто его выполняет, требуется ли одобрение и может ли оно менять рабочие данные. Недоступное действие система не должна имитировать.
          </p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Действие</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Класс</th>
                <th>Исполнитель</th>
                <th>Одобрение</th>
                <th>Изменение данных</th>
                <th>Ограничения</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.action_code}>
                  <td>
                    <strong>{asText(row.action_name, row.action_code)}</strong>
                    <div className="muted">{row.action_code}</div>
                  </td>
                  <td>{asText(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${stateClass(row.action_state)}`}>
                      {asText(row.action_state)}
                    </span>
                    <div className="muted">{asText(row.implementation_state)}</div>
                  </td>
                  <td>{asText(row.action_class)}</td>
                  <td>{asText(row.executor_type)}</td>
                  <td>{asText(row.approval_class)}</td>
                  <td>
                    {row.production_mutation === true ? (
                      <span className="status-pill danger">Рабочие данные</span>
                    ) : row.production_mutation === false ? (
                      <span className="badge">Без записи в рабочие данные</span>
                    ) : '—'}
                    {row.dry_run_default ? <div className="badge-row"><span className="badge">по умолчанию тестовый режим</span></div> : null}
                  </td>
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
