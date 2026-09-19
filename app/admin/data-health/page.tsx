import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { DataSourceHealthRow } from '@/lib/types';
import { dataFreshnessLabel, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getRows(): Promise<{ rows: DataSourceHealthRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_data_source_health_latest_safe_v1')
    .select('*')
    .order('source_code', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as DataSourceHealthRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function authorityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string, string> = {
    CURRENT_FIRST_PARTY: 'Текущий внутренний источник',
    DERIVED_OPERATIONAL: 'Рассчитано внутри FEYA',
    EXTERNAL_MARKET: 'Внешний рыночный источник',
    LEGACY_FIRST_PARTY: 'Исторический внутренний источник',
  };
  return labels[key] || 'Источник данных';
}

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function healthRank(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'UNAVAILABLE') return 0;
  if (key === 'DEGRADED') return 1;
  if (key === 'NOT_OBSERVABLE' || key === 'STALE') return 2;
  if (key === 'HEALTHY') return 4;
  return 3;
}

function healthClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'HEALTHY') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE') return 'danger';
  return 'warning';
}

export default async function AdminDataHealthPage() {
  const { rows, error } = await getRows();

  const healthy = rows.filter((row) => row.health_state === 'HEALTHY').length;
  const degraded = rows.filter((row) => row.health_state === 'DEGRADED').length;
  const unavailable = rows.filter((row) => row.health_state === 'UNAVAILABLE').length;
  const notObservable = rows.filter((row) => row.health_state === 'NOT_OBSERVABLE').length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/data-authority">Источники истины</Link>
            <Link href="/admin/data-health">Состояние данных</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Свежесть и доступность данных · последний снимок</div>
          <h1>Состояние данных</h1>
          <p>
            Надёжность источника, его доступность и свежесть — разные вещи. Отсутствующие или устаревшие данные показываются явно и не должны трактоваться как нулевая бизнес-активность.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Источников недоступны</span></div>
          <div className="owner-summary-cell"><strong>{degraded}</strong><span>Работают с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{notObservable}</strong><span>Недостаточно наблюдения</span></div>
          <div className="owner-summary-cell"><strong>{healthy}</strong><span>Работают нормально</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="notice" style={{ marginBottom: '18px' }}>
          Это журнал снимков состояния. Автоматический планировщик проверки источников пока не запущен, поэтому важно время последней проверки.
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Источник</th>
                <th>Тип источника</th>
                <th>Состояние</th>
                <th>Свежесть</th>
                <th>Последние данные</th>
                <th>Строк</th>
                <th>Ограничение</th>
                <th>Проверено</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state)).map((row) => (
                <tr key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                  <td>
                    <strong title={asText(row.source_code)}>{sourceLabel(row.source_code)}</strong>
                  </td>
                  <td title={`${asText(row.authority_tier)} · ${asText(row.authority_domain)}`}>
                    {authorityLabel(row.authority_tier)}
                  </td>
                  <td>
                    <span className={`status-pill ${healthClass(row.health_state)}`}>
                      {statusLabel(row.health_state)}
                    </span>
                  </td>
                  <td>{dataFreshnessLabel(row.freshness_state)}</td>
                  <td>{dateTimeLabel(row.watermark_at)}</td>
                  <td>{row.observed_row_count ?? '—'}</td>
                  <td>
                    {row.error_message ? (
                      <details>
                        <summary className="cursor-pointer text-[var(--gold-warm)]">Показать ограничение</summary>
                        <div className="muted" style={{ marginTop: '6px' }} title={asText(row.error_code)}>{asText(row.error_message)}</div>
                      </details>
                    ) : '—'}
                  </td>
                  <td>{dateTimeLabel(row.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
