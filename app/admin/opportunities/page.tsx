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

function opportunityTypeLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    EVENT: 'Событие',
    SEASONAL: 'Сезонная',
    SEARCH_DEMAND: 'Поисковый спрос',
    PRODUCT: 'Товарная',
    CONTENT: 'Контент',
    COMMERCIAL: 'Коммерческая',
    TECHNICAL: 'Техническая',
  };
  return labels[key] || (key ? 'Возможность роста' : '—');
}

function dateLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(date);
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

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Возможностей зафиксировано</span></div>
          <div className="owner-summary-cell"><strong>{expiringSoon}</strong><span>Окно закрывается ≤48 ч</span></div>
          <div className="owner-summary-cell"><strong>{thisWeek}</strong><span>Окно закрывается на этой неделе</span></div>
          <div className="owner-summary-cell"><strong>{actioning}</strong><span>Уже в работе</span></div>
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
                      <div className="muted" title={asText(row.opportunity_type)}>Тип: {opportunityTypeLabel(row.opportunity_type)}</div>
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
                      {dateLabel(row.commercial_expiry_at)}
                      <div className="muted">срок задачи: {dateLabel(row.due_at)}</div>
                    </td>
                    <td>
                      {dateLabel(row.event_starts_at)}
                      <div className="muted">→ {dateLabel(row.event_ends_at)}</div>
                    </td>
                    <td>{row.initiative_id ? <Link href="/admin/strategy" title={asText(row.initiative_id)}>Связана с инициативой</Link> : 'Не создана'}</td>
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
