import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthCapabilityStatusRow } from '@/lib/types';
import { capabilityLabel, capabilityOwnerSummary, implementationStateLabel, roleLabel, statusLabel } from '@/lib/owner-ui/terminology';

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
            Что FEYA реально умеет наблюдать или выполнять сейчас. Отсутствующие интеграции остаются недоступными и не подменяются догадками ИИ.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{countState(rows, 'AVAILABLE')}</strong><span>Работают полностью</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'AVAILABLE_WITH_LIMITATIONS')}</strong><span>Работают с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'DEGRADED')}</strong><span>Работают нестабильно</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'UNAVAILABLE') + countState(rows, 'NOT_OBSERVABLE')}</strong><span>Недоступны / недостаточно данных</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Возможность</th>
                <th>Ответственный</th>
                <th>Состояние</th>
                <th>Готовность</th>
                <th>Что это значит</th>
                <th>Техническая глубина</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.capability_code}>
                  <td>
                    <strong title={asText(row.capability_code)}>{capabilityLabel(row.capability_code)}</strong>
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>
                    <span className={`status-pill ${statusClass(row.capability_state)}`}>
                      {statusLabel(row.capability_state)}
                    </span>
                  </td>
                  <td title={asText(row.implementation_state)}>{implementationStateLabel(row.implementation_state)}</td>
                  <td>{capabilityOwnerSummary(row.capability_code)}</td>
                  <td><details><summary className="cursor-pointer text-[var(--gold-warm)]">Показать</summary><div className="muted" style={{ marginTop: '6px' }}>{asText(row.public_summary)}<br />{asText(row.limitations_summary)}</div></details></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
