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

export default async function AdminSystemReadinessPage({ searchParams }: { searchParams: Promise<{ q?: string; state?: string }> }) {
  const params = await searchParams;
  const { rows, error } = await getCapabilities();
  const q = String(params.q || '').trim().toLowerCase();
  const stateFilter = String(params.state || 'attention').toUpperCase();

  const filteredRows = rows
    .filter((row) => {
      const haystack = [capabilityLabel(row.capability_code), capabilityOwnerSummary(row.capability_code), row.capability_code]
        .map((value) => String(value || '').toLowerCase())
        .join(' ');
      const matchesQuery = !q || haystack.includes(q);
      const state = String(row.capability_state || '').toUpperCase();
      const matchesState =
        stateFilter === 'ALL' ||
        (stateFilter === 'ATTENTION' && state !== 'AVAILABLE') ||
        state === stateFilter;
      return matchesQuery && matchesState;
    })
    .sort((a, b) => {
      const rank = (value: unknown) => {
        const key = asText(value, '').toUpperCase();
        if (key === 'UNAVAILABLE') return 0;
        if (key === 'DEGRADED') return 1;
        if (key === 'NOT_OBSERVABLE') return 2;
        if (key === 'AVAILABLE_WITH_LIMITATIONS') return 3;
        return 4;
      };
      return rank(a.capability_state) - rank(b.capability_state) || capabilityLabel(a.capability_code).localeCompare(capabilityLabel(b.capability_code), 'ru');
    });

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

        <form action="/admin/system-readiness" className="owner-card" style={{ marginBottom: '14px' }}>
          <div className="grid gap-3 md:grid-cols-[1fr_280px_auto] md:items-end">
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Поиск возможности</div>
              <input name="q" defaultValue={q} className="field" placeholder="Google Ads, GA4, контент, заказы…" />
            </label>
            <label>
              <div className="owner-section-kicker" style={{ marginBottom: '6px' }}>Состояние</div>
              <select name="state" defaultValue={stateFilter} className="field">
                <option value="ATTENTION">Требует внимания</option>
                <option value="UNAVAILABLE">Недоступно</option>
                <option value="DEGRADED">Работает нестабильно</option>
                <option value="NOT_OBSERVABLE">Недостаточно данных</option>
                <option value="AVAILABLE_WITH_LIMITATIONS">Работает с ограничениями</option>
                <option value="AVAILABLE">Работает полностью</option>
                <option value="ALL">Все</option>
              </select>
            </label>
            <button type="submit" className="owner-button primary">Применить</button>
          </div>
          <div className="owner-card-meta" style={{ marginTop: '10px', marginBottom: 0 }}>
            <span>Показано: {filteredRows.length}</span>
            <span>Всего: {rows.length}</span>
            <Link href="/admin/system-readiness">Сбросить</Link>
          </div>
        </form>

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
              {filteredRows.map((row) => (
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
