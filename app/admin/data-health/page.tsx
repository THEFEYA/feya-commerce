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

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          <div className="card metric"><strong>{rows.length}</strong><span>Источников</span></div>
          <div className="card metric"><strong>{healthy}</strong><span>Работают нормально</span></div>
          <div className="card metric"><strong>{degraded}</strong><span>Работают с ограничениями</span></div>
          <div className="card metric"><strong>{unavailable}</strong><span>Недоступны</span></div>
          <div className="card metric"><strong>{notObservable}</strong><span>Нет наблюдения</span></div>
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
                <th>Уровень доверия</th>
                <th>Состояние</th>
                <th>Свежесть</th>
                <th>Последние данные</th>
                <th>Строк</th>
                <th>Ошибка / ограничение</th>
                <th>Проверено</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                  <td>
                    <strong>{sourceLabel(row.source_code)}</strong>
                    <div className="muted">{row.source_code}</div>
                    <div className="muted">{asText(row.source_instance_key)}</div>
                  </td>
                  <td>
                    {asText(row.authority_tier)}
                    <div className="muted">{asText(row.authority_domain)}</div>
                  </td>
                  <td>
                    <span className={`status-pill ${healthClass(row.health_state)}`}>
                      {statusLabel(row.health_state)}
                    </span>
                  </td>
                  <td>{dataFreshnessLabel(row.freshness_state)}</td>
                  <td>{asText(row.watermark_at)}</td>
                  <td>{row.observed_row_count ?? '—'}</td>
                  <td>
                    {asText(row.error_code)}
                    <div className="muted">{asText(row.error_message)}</div>
                  </td>
                  <td>{asText(row.checked_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
