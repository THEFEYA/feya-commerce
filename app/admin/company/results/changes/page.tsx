import Link from 'next/link';
import { History, ShieldCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { ChangeEventRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getChanges(): Promise<{ rows: ChangeEventRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };

  const { data, error } = await supabase
    .from('feya_commerce_v_change_events_safe_v1')
    .select('*')
    .order('event_at', { ascending: false })
    .limit(300);

  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as ChangeEventRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function humanize(value: unknown, fallback = 'Изменение') {
  const text = asText(value, '');
  if (!text) return fallback;
  return text
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function dateTimeLabel(value: unknown) {
  if (!value) return 'время не зафиксировано';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return asText(value);
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function relativeBucket(value: unknown) {
  if (!value) return 'Без даты';
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return 'Без даты';
  const now = Date.now();
  const age = now - date.getTime();
  if (age < 24 * 60 * 60 * 1000) return 'Сегодня';
  if (age < 7 * 24 * 60 * 60 * 1000) return 'Последние 7 дней';
  if (age < 30 * 24 * 60 * 60 * 1000) return 'Последние 30 дней';
  return 'Раньше';
}

export default async function AdminChangesPage() {
  const { rows, error } = await getChanges();
  const linkedExecution = rows.filter((row) => row.execution_request_id).length;
  const linkedCases = rows.filter((row) => row.case_id).length;
  const linkedIncidents = rows.filter((row) => row.incident_id).length;

  const buckets = ['Сегодня', 'Последние 7 дней', 'Последние 30 дней', 'Раньше', 'Без даты']
    .map((label) => ({ label, rows: rows.filter((row) => relativeBucket(row.event_at) === label) }))
    .filter((group) => group.rows.length);

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Результаты · история</div>
            <h1>Изменения</h1>
            <p>Что действительно менялось в системе и с каким рабочим контекстом это связано. Сам факт изменения ещё не означает положительный бизнес-результат.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/results" className="owner-button">Назад к результатам</Link>
            <Link href="/admin/company/advanced" className="owner-button">Технические детали</Link>
          </div>
        </header>

        <section className="owner-queue-strip" aria-label="История изменений" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><History size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Изменений</strong><small>зафиксировано в реестре</small></span>
            <b>{rows.length}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Через выполнение</strong><small>есть execution request</small></span>
            <b>{linkedExecution}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon" aria-hidden="true"><History size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Связаны с работой</strong><small>есть Growth Case</small></span>
            <b>{linkedCases}</b>
          </div>
          <Link href="/admin/incidents" className="owner-queue-item">
            <span className="owner-queue-icon" aria-hidden="true"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Связаны с инцидентом</strong><small>важно для интерпретации</small></span>
            <b>{linkedIncidents}</b>
          </Link>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        {!error && rows.length === 0 ? (
          <div className="owner-result-empty-state">
            <span className="owner-result-empty-icon" aria-hidden="true"><History size={20} strokeWidth={1.6} /></span>
            <div>
              <strong>Зафиксированных изменений пока нет</strong>
              <p>Это ожидаемо до реального выполнения. FEYA не создаёт историю только ради заполнения интерфейса.</p>
            </div>
          </div>
        ) : null}

        {buckets.map((group) => (
          <section className="owner-section" key={group.label} style={group.label === 'Сегодня' ? { marginTop: 0 } : undefined}>
            <div className="owner-section-head">
              <div className="owner-section-heading">
                <span className="owner-section-icon is-info" aria-hidden="true"><History size={17} strokeWidth={1.7} /></span>
                <div><h2>{group.label}</h2><div className="owner-section-kicker">{group.rows.length} записей</div></div>
              </div>
            </div>
            <div className="owner-list">
              {group.rows.map((row) => (
                <article className="owner-list-row" key={row.change_event_id}>
                  <div className="owner-list-row-main">
                    <div className="owner-card-meta">
                      <span className="owner-status is-info">{humanize(row.change_domain, 'Система')}</span>
                      <span>{humanize(row.entity_type, 'Объект')}</span>
                      <span>{humanize(row.source_type, 'Источник')}</span>
                    </div>
                    <h3>{humanize(row.change_type, row.event_code || 'Изменение')}</h3>
                    <p>
                      {row.market_code ? `Рынок: ${row.market_code}. ` : ''}
                      {row.locale ? `Локаль: ${row.locale}. ` : ''}
                      {row.execution_request_id ? 'Изменение связано с контролируемым выполнением.' : 'Execution request не указан.'}
                    </p>
                  </div>
                  <div className="owner-list-row-side">
                    <span className="owner-section-kicker">{dateTimeLabel(row.event_at)}</span>
                    {row.execution_request_id ? <Link href="/admin/executions" className="owner-button">Выполнение</Link> : null}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))}

        {rows.length ? (
          <section className="owner-section">
            <details className="owner-disclosure owner-disclosure-section">
              <summary>
                <span><strong>Технические связи изменений</strong><small>ID case / execution / incident и версионные снимки</small></span>
                <span className="owner-section-kicker">Advanced</span>
              </summary>
              <div className="owner-disclosure-body">
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>Изменение</th><th>Case</th><th>Execution</th><th>Incident</th><th>Время</th></tr></thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr key={row.change_event_id}>
                          <td><strong title={asText(row.event_code)}>{humanize(row.change_type, row.event_code || 'Изменение')}</strong></td>
                          <td>{row.case_id ? 'Связано' : '—'}</td>
                          <td>{row.execution_request_id ? 'Связано' : '—'}</td>
                          <td>{row.incident_id ? 'Связано' : '—'}</td>
                          <td>{dateTimeLabel(row.event_at)}</td>
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
