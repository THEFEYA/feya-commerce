import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
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


  const activeRows = rows
    .filter((row) => row.opportunity_status !== 'EXPIRED' && row.opportunity_status !== 'CLOSED' && row.opportunity_status !== 'CANCELLED')
    .sort((a, b) => {
      const priorityRank = (value: unknown) => {
        const key = asText(value, '').toUpperCase();
        if (key === 'P0') return 0;
        if (key === 'P1') return 1;
        if (key === 'P2') return 2;
        return 3;
      };
      const expiryRank = (value: unknown) => {
        const key = asText(value, '').toUpperCase();
        if (key === 'EXPIRING_SOON') return 0;
        if (key === 'EXPIRING_THIS_WEEK') return 1;
        return 2;
      };
      return expiryRank(a.expiry_state) - expiryRank(b.expiry_state) || priorityRank(a.priority) - priorityRank(b.priority);
    });
  const historicalRows = rows.filter((row) => !activeRows.includes(row));
  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Рост · возможности</div>
            <h1>Возможности</h1>
            <p>Показываем только реальные возможности из Growth OS. Дата события и коммерческое окно разделены: окно для производства и доставки может закрыться раньше самого события.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/growth" className="owner-button">Назад к росту</Link>
            <Link href="/admin/strategy" className="owner-button">Стратегия</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{activeRows.length}</strong><span>Актуальных возможностей</span></div>
          <div className="owner-summary-cell"><strong>{expiringSoon}</strong><span>Окно закрывается ≤48 ч</span></div>
          <div className="owner-summary-cell"><strong>{thisWeek}</strong><span>Окно закрывается на этой неделе</span></div>
          <div className="owner-summary-cell"><strong>{actioning}</strong><span>Уже в работе</span></div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что можно использовать сейчас</h2>
              <div className="owner-section-kicker">Сначала возможности с ближайшим коммерческим окном и высоким приоритетом</div>
            </div>
          </div>

          {activeRows.length ? (
            <div className="owner-list">
              {activeRows.map((row) => (
                <article className="owner-list-row" key={row.opportunity_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${row.expiry_state === 'EXPIRING_SOON' ? 'is-danger' : row.expiry_state === 'EXPIRING_THIS_WEEK' ? 'is-warning' : 'is-info'}`}>
                        {stateLabel(row.expiry_state || row.opportunity_status)}
                      </span>
                      <span>{opportunityTypeLabel(row.opportunity_type)}</span>
                      <span>{roleLabel(row.owner_role)}</span>
                    </div>
                    <h3>{asText(row.title, 'Возможность роста')}</h3>
                    <p>
                      Коммерческий срок: {dateLabel(row.commercial_expiry_at)}.
                      {row.event_starts_at ? ` Событие: ${dateLabel(row.event_starts_at)} → ${dateLabel(row.event_ends_at)}.` : ''}
                    </p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{asText(row.priority, 'P3')}</span>
                    {row.initiative_id ? <Link href="/admin/strategy" className="owner-button">Открыть инициативу</Link> : <span className="owner-section-kicker">инициатива не создана</span>}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="owner-empty">Реальные возможности роста пока не зафиксированы. FEYA не создаёт декоративные карточки возможностей без данных.</div>
          )}
        </section>

        {historicalRows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>История возможностей</strong><small>Закрытые, отменённые и истёкшие окна</small></span>
                <span className="owner-section-kicker">{historicalRows.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-list">
                {historicalRows.map((row) => (
                  <article className="owner-list-row" key={row.opportunity_id}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta"><span>{stateLabel(row.opportunity_status)}</span><span>{opportunityTypeLabel(row.opportunity_type)}</span></div>
                      <h3>{asText(row.title, 'Возможность роста')}</h3>
                      <p>{dateLabel(row.commercial_expiry_at)}</p>
                    </div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Техническая таблица</strong><small>Все поля реестра возможностей</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Возможность</th><th>Ответственный</th><th>Статус</th><th>Коммерческий срок</th><th>Событие</th><th>Инициатива</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.opportunity_id}>
                        <td><strong>{asText(row.title, row.opportunity_code || '—')}</strong><div className="muted">{opportunityTypeLabel(row.opportunity_type)}</div></td>
                        <td>{roleLabel(row.owner_role)}</td>
                        <td>{stateLabel(row.opportunity_status)}<div className="muted">{stateLabel(row.expiry_state)}</div></td>
                        <td>{dateLabel(row.commercial_expiry_at)}</td>
                        <td>{dateLabel(row.event_starts_at)} → {dateLabel(row.event_ends_at)}</td>
                        <td>{row.initiative_id ? 'Связана' : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        </section>
      </div>
    </main>
  );
}
