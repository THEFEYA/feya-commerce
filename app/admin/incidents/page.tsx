import Link from 'next/link';
import { CircleAlert, ShieldCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { OwnerIncidentDrawerClient } from '@/components/admin/OwnerIncidentDrawerClient';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ActiveIncidentRow } from '@/lib/types';
import { statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getIncidents(): Promise<{ rows: ActiveIncidentRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_change_freeze_status_safe_v1')
    .select('*')
    .order('severity', { ascending: true })
    .order('started_at', { ascending: true });

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ActiveIncidentRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function severityLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'P0') return 'Критично';
  if (key === 'P1') return 'Очень важно';
  if (key === 'P2') return 'Важно';
  if (key === 'P3') return 'Наблюдать';
  return asText(value);
}

function severityTone(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'P0' || key === 'P1') return 'is-danger';
  if (key === 'P2') return 'is-warning';
  return 'is-info';
}

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

export default async function AdminIncidentsPage() {
  const { rows, error } = await getIncidents();
  const freezes = rows.filter((row) => row.freeze_mutations).length;
  const critical = rows.filter((row) => ['P0', 'P1'].includes(String(row.severity || '').toUpperCase())).length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Надёжность</div>
            <h1>Инциденты</h1>
            <p>Только реальные проблемы, которые могут ограничить работу или временно заморозить изменяющие действия. Одинаковая первопричина не должна превращаться в десятки owner-alerts.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system#permissions" className="owner-button">Назад к системе</Link>
            <Link href="/admin/executions" className="owner-button">История выполнения</Link>
          </div>
        </header>

        <section className="owner-queue-strip" aria-label="Состояние инцидентов" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Активные инциденты</strong><small>реальные текущие записи</small></span>
            <b>{rows.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><CircleAlert size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Критичные / очень важные</strong><small>P0–P1</small></span>
            <b>{critical}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Заморозки изменений</strong><small>mutation freeze</small></span>
            <b>{freezes}</b>
          </div>
          <Link href="/admin/execution-map" className="owner-queue-item">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Права действий</strong><small>что можно выполнять сейчас</small></span>
            <b>→</b>
          </Link>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        {!error && !rows.length ? (
          <div className="owner-result-empty-state">
            <span className="owner-result-empty-icon" aria-hidden="true"><ShieldCheck size={20} strokeWidth={1.6} /></span>
            <div>
              <strong>Активных инцидентов и заморозок изменений нет</strong>
              <p>Это нормальное состояние. Раздел остаётся тихим, пока реальная проблема не требует остановить или ограничить выполнение.</p>
            </div>
          </div>
        ) : null}

        {rows.length ? (
          <section className="owner-section" style={{ marginTop: 0 }}>
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-attention" aria-hidden="true"><CircleAlert size={17} strokeWidth={1.7} /></span>
                <div><h2>Что требует внимания</h2><div className="owner-section-kicker">Сначала влияние на работу, затем инженерные детали</div></div>
              </div>
            </div>

            <div className="owner-list">
              {rows.map((row) => (
                <article className="owner-list-row" key={row.incident_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className={`owner-status ${severityTone(row.severity)}`}>{severityLabel(row.severity)}</span>
                      <span>{statusLabel(row.incident_status)}</span>
                      {row.freeze_mutations ? <span className="owner-status is-danger">Изменения заморожены</span> : <span>без общей заморозки</span>}
                    </div>
                    <h3>{asText(row.title, 'Инцидент')}</h3>
                    <p>{asText(row.summary, 'Подробное описание причины пока не зафиксировано.')}</p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{dateTimeLabel(row.started_at)}</span>
                    <OwnerIncidentDrawerClient row={row} />
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {rows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Технический реестр инцидентов</strong><small>Коды, scope и freeze domains — только для диагностики</small></span>
                <span className="owner-section-kicker">{rows.length}</span>
              </summary>
              <div className="owner-disclosure-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Инцидент</th><th>Важность</th><th>Статус</th><th>Заморозка</th><th>Первопричина</th><th>Начало</th></tr></thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.incident_id}>
                          <td><strong title={asText(row.incident_code)}>{asText(row.title, 'Инцидент')}</strong></td>
                          <td>{severityLabel(row.severity)}</td>
                          <td>{statusLabel(row.incident_status)}</td>
                          <td>{row.freeze_mutations ? 'Да' : 'Нет'}</td>
                          <td>{row.root_cause_key ? 'Объединена системой' : 'Не определена'}</td>
                          <td>{dateTimeLabel(row.started_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </details>
          </section>
        ) : null}
      </div>
    </main>
  );
}
