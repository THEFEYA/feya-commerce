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
      const haystack = [capabilityLabel(row.capability_code), capabilityOwnerSummary(row.capability_code), roleLabel(row.owner_role), row.capability_code]
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

  const issueRows = filteredRows.filter((row) => String(row.capability_state || '').toUpperCase() !== 'AVAILABLE');
  const healthyRows = filteredRows.filter((row) => String(row.capability_state || '').toUpperCase() === 'AVAILABLE');

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · возможности</div>
            <h1>Готовность системы</h1>
            <p>Какие возможности FEYA реально доступны сейчас, что ограничено и что ещё нельзя использовать. Недоступные интеграции не подменяются догадками ИИ.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system" className="owner-button">Назад к системе</Link>
            <Link href="/admin/execution-map" className="owner-button">Права действий</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{countState(rows, 'UNAVAILABLE') + countState(rows, 'NOT_OBSERVABLE')}</strong><span>Недоступны / недостаточно данных</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'DEGRADED')}</strong><span>Работают нестабильно</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'AVAILABLE_WITH_LIMITATIONS')}</strong><span>Работают с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{countState(rows, 'AVAILABLE')}</strong><span>Работают полностью</span></div>
        </section>

        {error ? <div className="owner-card is-danger"><div className="owner-status is-danger">Ошибка данных</div><p className="owner-card-copy">{error}</p></div> : null}

        <form action="/admin/system-readiness" className="owner-card" style={{ marginBottom: '18px' }}>
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
            <span>Всего возможностей: {rows.length}</span>
            <Link href="/admin/system-readiness">Сбросить</Link>
          </div>
        </form>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что ограничивает FEYA сейчас</h2>
              <div className="owner-section-kicker">Сначала только возможности, которые мешают наблюдению, анализу или безопасному действию</div>
            </div>
          </div>

          {issueRows.length ? (
            <div className="owner-grid two">
              {issueRows.map((row) => {
                const state = String(row.capability_state || '');
                const tone = state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' ? 'is-danger' : 'is-warning';
                return (
                  <article className={`owner-card ${tone}`} key={row.capability_code}>
                    <div className="owner-card-meta">
                      <span className={`owner-status ${tone}`}>{statusLabel(row.capability_state)}</span>
                      <span>{roleLabel(row.owner_role)}</span>
                    </div>
                    <h3 className="owner-card-title">{capabilityLabel(row.capability_code)}</h3>
                    <p className="owner-card-copy">{capabilityOwnerSummary(row.capability_code)}</p>
                    <p className="owner-role-note"><strong>Готовность:</strong> {implementationStateLabel(row.implementation_state)}</p>
                    <details className="owner-disclosure owner-disclosure-section" style={{ marginTop: '12px' }}>
                      <summary>
                        <span><strong>Почему ограничено</strong><small>Техническая причина и следующий уровень диагностики</small></span>
                        <span className="owner-section-kicker">Подробнее</span>
                      </summary>
                      <div className="owner-disclosure-body">
                        <p className="owner-card-copy">{asText(row.limitations_summary, 'Дополнительное ограничение не описано.')}</p>
                        <div className="owner-card-meta" style={{ marginBottom: 0 }}>
                          <span title={asText(row.capability_code)}>Код возможности скрыт</span>
                        </div>
                      </div>
                    </details>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Ограничений по текущему фильтру нет</div>
              <p className="owner-card-copy">Выбранные возможности не требуют внимания.</p>
            </div>
          )}
        </section>

        {healthyRows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Работают полностью</strong><small>Нормальное состояние скрыто, чтобы не превращать экран в стену зелёных карточек</small></span>
                <span className="owner-section-kicker">{healthyRows.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-grid two">
                {healthyRows.map((row) => (
                  <article className="owner-card is-success" key={row.capability_code}>
                    <div className="owner-card-meta"><span className="owner-status is-success">Работает</span><span>{roleLabel(row.owner_role)}</span></div>
                    <h3 className="owner-card-title">{capabilityLabel(row.capability_code)}</h3>
                    <p className="owner-card-copy">{capabilityOwnerSummary(row.capability_code)}</p>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полный технический реестр</strong><small>Все коды, состояния реализации и исходные ограничения</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Возможность</th><th>Ответственный</th><th>Состояние</th><th>Готовность</th><th>Исходное ограничение</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.capability_code}>
                        <td><strong title={asText(row.capability_code)}>{capabilityLabel(row.capability_code)}</strong></td>
                        <td>{roleLabel(row.owner_role)}</td>
                        <td>{statusLabel(row.capability_state)}</td>
                        <td>{implementationStateLabel(row.implementation_state)}</td>
                        <td>{asText(row.limitations_summary)}</td>
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
