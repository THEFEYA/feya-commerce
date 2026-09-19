import Link from 'next/link';
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

function dateTimeLabel(value: unknown) {
  if (!value) return '—';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short' }).format(date);
}

function severityClass(value: unknown) {
  const severity = asText(value, '').toUpperCase();
  if (severity === 'P0' || severity === 'P1') return 'danger';
  if (severity === 'P2') return 'warning';
  return 'ok';
}

export default async function AdminIncidentsPage() {
  const { rows, error } = await getIncidents();
  const freezes = rows.filter((row) => row.freeze_mutations).length;

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/incidents">Инциденты</Link>
            <Link href="/admin/signals">Сигналы</Link>
            <Link href="/admin/execution-map">Права действий</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Инциденты и заморозка изменений · только просмотр</div>
          <h1>Инциденты</h1>
          <p>
            Активные инциденты P0/P1 могут замораживать изменяющие действия в затронутых областях. Одинаковая первопричина объединяется, чтобы одна общая проблема не превращалась в сотни отдельных инцидентов.
          </p>
        </section>

        <section className="owner-summary-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-summary-cell"><strong>{rows.length}</strong><span>Активных инцидентов</span></div>
          <div className="owner-summary-cell"><strong>{freezes}</strong><span>Замораживают изменения</span></div>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        {!rows.length ? (
          <div className="notice">Активных инцидентов и заморозок изменений нет.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Важность</th>
                  <th>Инцидент</th>
                  <th>Статус</th>
                  <th>Заморозка</th>
                  <th>Первопричина</th>
                  <th>Область</th>
                  <th>Начало</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.incident_id}>
                    <td>
                      <span className={`status-pill ${severityClass(row.severity)}`}>
                        {severityLabel(row.severity)}
                      </span>
                    </td>
                    <td>
                      <strong title={asText(row.incident_code)}>{asText(row.title, 'Инцидент')}</strong>
                      <div className="muted">{asText(row.summary)}</div>
                    </td>
                    <td>{statusLabel(row.incident_status)}</td>
                    <td>
                      {row.freeze_mutations ? (
                        <>
                          <span className="status-pill danger">ИЗМЕНЕНИЯ ЗАМОРОЖЕНЫ</span>
                          <details><summary className="cursor-pointer text-[var(--gold-warm)]">Какие области</summary><div className="muted" style={{ marginTop: '6px' }}>{asText(row.freeze_domains_json)}</div></details>
                        </>
                      ) : (
                        <span className="badge">без заморозки</span>
                      )}
                    </td>
                    <td>{row.root_cause_key ? <span title={asText(row.root_cause_key)}>Одна объединённая причина</span> : 'Не определена'}</td>
                    <td><details><summary className="cursor-pointer text-[var(--gold-warm)]">Показать область</summary><div className="muted" style={{ marginTop: '6px' }}>{asText(row.scope_json)}</div></details></td>
                    <td>{dateTimeLabel(row.started_at)}</td>
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
