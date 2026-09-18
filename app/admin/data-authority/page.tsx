import Link from 'next/link';
import { getAdminReadClient, getMissingAdminDataEnvMessage } from '@/lib/adminData';
import type { SourceOfTruthRegistryRow } from '@/lib/types';
import { roleLabel, sourceLabel, statusLabel } from '@/lib/owner-ui/terminology';

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

function stateClass(value: unknown) {
  const state = asText(value, '').toUpperCase();
  if (state === 'AVAILABLE') return 'ok';
  if (state === 'UNAVAILABLE' || state === 'NOT_OBSERVABLE') return 'danger';
  return 'warning';
}

function tierClass(value: unknown) {
  const tier = asText(value, '').toUpperCase();
  if (tier === 'CURRENT_FIRST_PARTY') return 'ok';
  if (tier === 'DERIVED_OPERATIONAL') return 'warning';
  return 'badge';
}

export default async function AdminDataAuthorityPage() {
  const { rows, error } = await getSources();

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/data-authority">Источники истины</Link>
            <Link href="/admin/system-readiness">Готовность системы</Link>
            <Link href="/admin/metrics">Метрики</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">Реестр источников истины · только просмотр</div>
          <h1>Источники истины</h1>
          <p>
            FEYA разделяет достоверные собственные данные, исторические источники, внешние рыночные данные и производные сигналы. Источник более низкого уровня не может незаметно переопределить источник более высокого уровня.
          </p>
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Область</th>
                <th>Уровень доверия</th>
                <th>Состояние</th>
                <th>Ответственный</th>
                <th>Основной источник</th>
                <th>Приоритет источника</th>
                <th>Ограничение</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.source_code}>
                  <td>
                    <strong>{sourceLabel(row.source_code)}</strong>
                    <div className="muted">{asText(row.authority_domain)}</div>
                    <div className="muted">{row.source_code}</div>
                  </td>
                  <td>
                    <span className={tierClass(row.authority_tier)}>
                      {asText(row.authority_tier)}
                    </span>
                  </td>
                  <td>
                    <span className={`status-pill ${stateClass(row.source_state)}`}>
                      {statusLabel(row.source_state)}
                    </span>
                    <div className="muted">{asText(row.implementation_state)}</div>
                  </td>
                  <td>{roleLabel(row.owner_role)}</td>
                  <td>{asText(row.primary_source)}</td>
                  <td>{row.precedence ?? '—'}</td>
                  <td>
                    {asText(row.public_summary)}
                    <div className="muted">{asText(row.limitations_summary)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
