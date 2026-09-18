import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthCapabilityStatusRow } from '@/lib/types';
import { roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getCapabilities(): Promise<{ rows: GrowthCapabilityStatusRow[]; error?: string }> {
  const supabase = getAdminReadClient();

  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

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
            <Link href="/admin/products">Товары</Link>
            <Link href="/admin/seo-keywords">SEO-ключи</Link>
            <Link href="/admin/seo-portfolio">SEO-страницы</Link>
            <Link href="/admin/seo-clusters">Группы запросов</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Реестр возможностей FEYA · только просмотр</div>
          <h1>Готовность системы</h1>
          <p>
            Что FEYA реально умеет наблюдать или выполнять сейчас. Отсутствующие интеграции остаются недоступными и не подменяются догадками AI.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Возможностей зарегистрировано</span></div>
          <div className="card metric"><strong>{countState(rows, 'AVAILABLE')}</strong><span>Работают</span></div>
          <div className="card metric"><strong>{countState(rows, 'AVAILABLE_WITH_LIMITATIONS')}</strong><span>Работают с ограничениями</span></div>
          <div className="card metric"><strong>{countState(rows, 'DEGRADED')}</strong><span>Работают нестабильно</span></div>
          <div className="card metric"><strong>{countState(rows, 'UNAVAILABLE')}</strong><span>Недоступны</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Возможность</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Реализация</th>
                <th>Что уже есть</th>
                <th>Ограничение / следующий шаг</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.capability_code}>
                  <td>
                    <strong>{asText(row.capability_name, row.capability_code)}</strong>
                    <div className="muted">{row.capability_code}</div>
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.capability_state)}`}>
                      {statusLabel(row.capability_state)}
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
