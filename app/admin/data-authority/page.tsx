import Link from 'next/link';
import { Database, Layers3, ShieldCheck } from 'lucide-react';
import { OwnerDataError } from '@/components/admin/OwnerDataError';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SourceOfTruthRegistryRow } from '@/lib/types';
import { implementationStateLabel, roleLabel, sourceHealthSummary, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function getSources(): Promise<{ rows: SourceOfTruthRegistryRow[]; error?: string }> {
  const supabase = getAdminReadClient();
  if (!supabase) return { rows: [], error: getMissingAdminDataEnvMessage() };
  const { data, error } = await supabase
    .from('feya_commerce_v_source_of_truth_registry_safe_v1')
    .select('*')
    .order('precedence', { ascending: false })
    .order('source_code', { ascending: true });
  if (error) return { rows: [], error: error.message };
  return { rows: (data || []) as SourceOfTruthRegistryRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function tierLabel(value: unknown) {
  const key = asText(value, '').toUpperCase();
  const labels: Record<string,string> = {
    CURRENT_FIRST_PARTY: 'Текущий внутренний источник',
    EXTERNAL_MARKET: 'Внешний рыночный источник',
    LEGACY_FIRST_PARTY: 'Исторический внутренний источник',
    DERIVED_OPERATIONAL: 'Рассчитано внутри FEYA',
  };
  return labels[key] || 'Источник данных';
}

function tone(value: unknown) {
  const key = asText(value, '').toUpperCase();
  if (key === 'AVAILABLE') return 'is-success';
  if (key === 'UNAVAILABLE' || key === 'NOT_OBSERVABLE') return 'is-danger';
  return 'is-warning';
}

export default async function AdminDataAuthorityPage() {
  const { rows, error } = await getSources();
  const firstParty = rows.filter((row) => String(row.authority_tier || '').toUpperCase() === 'CURRENT_FIRST_PARTY').length;
  const external = rows.filter((row) => String(row.authority_tier || '').toUpperCase() === 'EXTERNAL_MARKET').length;
  const derived = rows.filter((row) => String(row.authority_tier || '').toUpperCase() === 'DERIVED_OPERATIONAL').length;
  const limited = rows.filter((row) => String(row.source_state || '').toUpperCase() !== 'AVAILABLE').length;

  return (
    <main className="owner-page">
      <div className="owner-page-inner">
        <header className="owner-page-head">
          <div>
            <div className="owner-eyebrow"><span className="owner-eyebrow-mark" aria-hidden="true" />Advanced · data governance</div>
            <h1>Источники истины</h1>
            <p>Какому источнику FEYA имеет право доверять в каждой области. Более слабый внешний или производный сигнал не может молча переопределить authoritative first-party truth.</p>
          </div>
          <div className="owner-actions" style={{ marginTop: 0 }}>
            <Link href="/admin/company/system" className="owner-button">Назад к системе</Link>
            <Link href="/admin/data-health" className="owner-button">Здоровье данных</Link>
          </div>
        </header>

        <section className="owner-queue-strip" style={{ marginBottom: '20px' }}>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><ShieldCheck size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>First-party</strong><small>главные источники истины</small></span>
            <b>{firstParty}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><Database size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Внешние</strong><small>рыночные сигналы</small></span>
            <b>{external}</b>
          </div>
          <div className="owner-queue-item is-static">
            <span className="owner-queue-icon"><Layers3 size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Производные</strong><small>рассчитаны внутри FEYA</small></span>
            <b>{derived}</b>
          </div>
          <Link href="/admin/system-readiness" className="owner-queue-item">
            <span className="owner-queue-icon"><Database size={15} strokeWidth={1.7} /></span>
            <span className="owner-queue-copy"><strong>Ограничены</strong><small>не полностью доступны</small></span>
            <b>{limited}</b>
          </Link>
        </section>

        {error ? <OwnerDataError error={error} /> : null}

        <div className="owner-card is-info" style={{ marginBottom: '18px' }}>
          <div className="owner-status is-info">Правило authority</div>
          <p className="owner-card-copy">Precedence — не «оценка качества». Это инженерное правило: какой источник имеет право быть источником истины для конкретного домена.</p>
        </div>

        <section className="owner-section" style={{ marginTop: 0 }}>
          <div className="owner-section-head"><div><h2>Текущая иерархия</h2><div className="owner-section-kicker">Сверху более авторитетные источники; ограничения показаны отдельно</div></div></div>
          <div className="owner-list">
            {rows.map((row) => (
              <article className="owner-list-row" key={row.source_code}>
                <div className="owner-list-row-main">
                  <div className="owner-card-meta">
                    <span className={`owner-status ${tone(row.source_state)}`}>{statusLabel(row.source_state)}</span>
                    <span>{tierLabel(row.authority_tier)}</span>
                    <span>{roleLabel(row.owner_role)}</span>
                  </div>
                  <h3>{sourceLabel(row.source_code)}</h3>
                  <p>{sourceHealthSummary(row.source_code)}</p>
                </div>
                <div className="owner-list-row-side">
                  <strong>{row.precedence != null ? `Уровень ${row.precedence}` : '—'}</strong>
                  <span className="owner-section-kicker">{implementationStateLabel(row.implementation_state)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="owner-section">
          <details className="owner-disclosure owner-disclosure-section">
            <summary>
              <span><strong>Технический реестр authority</strong><small>Коды, primary source и исходные ограничения</small></span>
              <span className="owner-section-kicker">{rows.length}</span>
            </summary>
            <div className="owner-disclosure-body">
              <div className="table-wrap">
                <table>
                  <thead><tr><th>Источник</th><th>Domain</th><th>Authority tier</th><th>State</th><th>Primary source</th><th>Precedence</th><th>Ограничение</th></tr></thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.source_code}>
                        <td><strong title={row.source_code}>{sourceLabel(row.source_code)}</strong></td>
                        <td>{asText(row.authority_domain)}</td>
                        <td>{tierLabel(row.authority_tier)}</td>
                        <td>{statusLabel(row.source_state)}</td>
                        <td>{asText(row.primary_source)}</td>
                        <td>{row.precedence ?? '—'}</td>
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
