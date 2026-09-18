import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { GrowthOpportunityRow } from '@/lib/types';
import { roleLabel } from '@/lib/owner-ui/terminology';

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

function stateLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    OPEN: 'Открыта',
    ACTIONING: 'В работе',
    CLOSED: 'Закрыта',
    EXPIRED: 'Срок истёк',
    CANCELLED: 'Отменена',
    EXPIRING_SOON: 'Истекает в ближайшие 48 часов',
    EXPIRING_THIS_WEEK: 'Истекает на этой неделе',
    ACTIVE: 'Актуальна',
  };
  return labels[key] || asText(value);
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
            <Link href="/admin/opportunities">Возможности</Link>
            <Link href="/admin/strategy">Стратегия</Link>
            <Link href="/admin/company/signals">Сигналы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Возможности и сроки · только просмотр</div>
          <h1>Возможности</h1>
          <p>
            Дата события и коммерческий срок учитываются отдельно: событие может быть ещё далеко, но окно для производства и доставки уже может закрываться.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Всего возможностей</span></div>
          <div className="card metric"><strong>{expiringSoon}</strong><span>Истекают ≤48 ч</span></div>
          <div className="card metric"><strong>{thisWeek}</strong><span>Истекают на этой неделе</span></div>
          <div className="card metric"><strong>{actioning}</strong><span>В работе</span></div>
          <div className="card metric"><strong>{expired}</strong><span>Срок истёк</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">Реальные возможности роста пока не зафиксированы.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Приоритет</th>
                  <th>Возможность</th>
                  <th>Ответственный</th>
                  <th>Статус</th>
                  <th>Коммерческий срок</th>
                  <th>Период события</th>
                  <th>Инициатива</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.opportunity_id}>
                    <td>{asText(row.priority)}</td>
                    <td>
                      <strong>{asText(row.title, row.opportunity_code || '—')}</strong>
                      <div className="muted">Тип: {asText(row.opportunity_type)}</div>
                      <div className="muted">{asText(row.event_name)}</div>
                    </td>
                    <td>{roleLabel(row.owner_role)}</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.opportunity_status)}`}>
                        {stateLabel(row.opportunity_status)}
                      </span>
                      <div className="badge-row">
                        <span className={`status-pill ${statusClass(row.expiry_state)}`}>
                          {stateLabel(row.expiry_state)}
                        </span>
                      </div>
                    </td>
                    <td>
                      {asText(row.commercial_expiry_at)}
                      <div className="muted">срок задачи: {asText(row.due_at)}</div>
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
