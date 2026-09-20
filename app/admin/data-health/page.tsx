import Link from 'next/link';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerDataSourceDrawerClient } from '@/components/admin/OwnerDataSourceDrawerClient';
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

  const issueRows = [...rows]
    .filter((row) => row.health_state !== 'HEALTHY')
    .sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state));
  const healthyRows = [...rows]
    .filter((row) => row.health_state === 'HEALTHY')
    .sort((a, b) => sourceLabel(a.source_code).localeCompare(sourceLabel(b.source_code), 'ru'));

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow">Система · данные</div>
            <h1>Состояние данных</h1>
            <p>Показываем доступность, свежесть и ограничения источников отдельно. Отсутствующие или устаревшие данные не трактуются как нулевая бизнес-активность.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system#sources" className="owner-button">Назад к системе</Link>
            <Link href="/admin/data-authority" className="owner-button">Источники истины</Link>
          </div>
        </header>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{unavailable}</strong><span>Недоступны</span></div>
          <div className="owner-summary-cell"><strong>{degraded}</strong><span>Работают с ограничениями</span></div>
          <div className="owner-summary-cell"><strong>{notObservable}</strong><span>Недостаточно наблюдения</span></div>
          <div className="owner-summary-cell"><strong>{healthy}</strong><span>Работают нормально</span></div>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Как читать экран</div>
          <p className="owner-card-copy">Это последний сохранённый снимок состояния. Автоматический планировщик проверки источников пока не запущен, поэтому рядом с каждым источником показывается время последней проверки и последнего набора данных.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head">
            <div>
              <h2>Что ограничивает решения сейчас</h2>
              <div className="owner-section-kicker">Сначала только источники с проблемами доступности, свежести или наблюдения</div>
            </div>
          </div>

          {issueRows.length ? (
            <div className="owner-list">
              {issueRows.map((row) => {
                const state = String(row.health_state || '');
                const tone = state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE' || state === 'STALE' ? 'is-danger' : 'is-warning';
                return (
                  <article className="owner-list-row" key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                    <div className="owner-list-row-main">
                      <div className="owner-card-meta">
                        <span className={`owner-status ${tone}`}>{statusLabel(row.health_state)}</span>
                        <span>{dataFreshnessLabel(row.freshness_state)}</span>
                        <span>{authorityLabel(row.authority_tier)}</span>
                      </div>
                      <h3>{sourceLabel(row.source_code)}</h3>
                      <p>{row.error_message ? asText(row.error_message) : 'Источник доступен не полностью или его состояние пока нельзя надёжно наблюдать.'}</p>
                    </div>
                    <div className="owner-list-row-side">
                      <span className="owner-section-kicker">данные: {dateTimeLabel(row.watermark_at)}</span>
                      <span className="owner-section-kicker">проверено: {dateTimeLabel(row.checked_at)}</span>
                      <OwnerDataSourceDrawerClient row={row} />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="owner-card is-success">
              <div className="owner-status is-success">Проблемных источников нет</div>
              <p className="owner-card-copy">Все наблюдаемые источники в последнем снимке работают нормально.</p>
            </div>
          )}
        </section>

        {healthyRows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Работают нормально</strong><small>Скрыты по умолчанию, потому что не требуют внимания</small></span>
                <span className="owner-section-kicker">{healthyRows.length}</span>
              </summary>
              <div className="owner-disclosure-body owner-grid two">
                {healthyRows.map((row) => (
                  <article className="owner-card is-success" key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                    <div className="owner-card-meta">
                      <span className="owner-status is-success">Работает</span>
                      <span>{dataFreshnessLabel(row.freshness_state)}</span>
                    </div>
                    <h3 className="owner-card-title">{sourceLabel(row.source_code)}</h3>
                    <p className="owner-card-copy">Последние данные: {dateTimeLabel(row.watermark_at)} · проверено: {dateTimeLabel(row.checked_at)}</p>
                    <div className="owner-actions"><OwnerDataSourceDrawerClient row={row} /></div>
                  </article>
                ))}
              </div>
            </details>
          </section>
        ) : null}

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Полный снимок источников</strong><small>Техническая таблица с количеством строк и исходными ограничениями</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Источник</th><th>Тип</th><th>Состояние</th><th>Свежесть</th><th>Последние данные</th><th>Строк</th><th>Ограничение</th><th>Проверено</th></tr>
                  </thead>
                  <tbody>
                    {[...rows].sort((a, b) => healthRank(a.health_state) - healthRank(b.health_state)).map((row) => (
                      <tr key={`${row.source_code}-${row.source_instance_key || 'default'}`}>
                        <td><strong title={asText(row.source_code)}>{sourceLabel(row.source_code)}</strong></td>
                        <td>{authorityLabel(row.authority_tier)}</td>
                        <td>{statusLabel(row.health_state)}</td>
                        <td>{dataFreshnessLabel(row.freshness_state)}</td>
                        <td>{dateTimeLabel(row.watermark_at)}</td>
                        <td>{row.observed_row_count ?? '—'}</td>
                        <td>{asText(row.error_message)}</td>
                        <td>{dateTimeLabel(row.checked_at)}</td>
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
