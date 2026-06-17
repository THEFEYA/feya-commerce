import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { SeoKeywordCleanupReportRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_KEYWORDS_LIMIT = 200;

const FILTERS = [
  { key: 'cleanup_pipeline_status', label: 'cleanup_pipeline_status' },
  { key: 'priority_tier', label: 'priority_tier' },
  { key: 'queue_suggested_page_level', label: 'page_level' },
] as const;

async function getSeoKeywordRows(): Promise<{ rows: SeoKeywordCleanupReportRow[]; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], error: getMissingSupabaseEnvMessage() };
  }

  const { data, error } = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select('*')
    .limit(SEO_KEYWORDS_LIMIT);

  if (error) {
    return { rows: [], error: error.message };
  }

  return { rows: (data || []) as SeoKeywordCleanupReportRow[] };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function asBoolean(value: unknown) {
  return value === true || value === 'true' || value === 1;
}

function countRows(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return rows.filter((row) => asBoolean(row[key])).length;
}

function getUniqueValues(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return Array.from(new Set(rows.map((row) => asText(row[key], '')).filter(Boolean))).slice(0, 10);
}

function getStatusClass(value: unknown) {
  const normalized = asText(value, '').toLowerCase();

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('clean')) {
    return 'ok';
  }

  if (normalized.includes('hold') || normalized.includes('error') || normalized.includes('reject')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminSeoKeywordsPage() {
  const { rows, error } = await getSeoKeywordRows();

  const metrics = [
    { label: 'Total rows shown', value: rows.length },
    { label: 'needs_ai_cleanup', value: countRows(rows, 'needs_ai_cleanup') },
    { label: 'needs_human_review', value: countRows(rows, 'needs_human_review') },
    { label: 'ready_for_metric_validation', value: countRows(rows, 'ready_for_metric_validation') },
    { label: 'hold', value: countRows(rows, 'should_hold') },
  ];

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/review">Review</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">SEO keyword validation gate</div>
          <h1>SEO Keywords</h1>
          <p>
            Generated keyword candidates are not final SEO keywords until cleaned, validated with real metrics, scored, and approved. This page is read-only and does not invent search volume, competition, CTR, bids, or trend metrics.
          </p>
        </section>

        <section className="grid admin-grid" style={{ marginBottom: '24px' }}>
          {metrics.map((metric) => (
            <div className="card metric" key={metric.label}>
              <strong>{metric.value}</strong>
              <span>{metric.label}</span>
            </div>
          ))}
        </section>

        {error ? <div className="notice">{error}</div> : null}

        <section className="toolbar" aria-label="Available read-only filters">
          {FILTERS.map((filter) => {
            const values = getUniqueValues(rows, filter.key);
            return (
              <div className="filter-chip" key={filter.key}>
                <strong>{filter.label}:</strong> {values.length ? values.join(' / ') : 'no values loaded'}
              </div>
            );
          })}
        </section>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>keyword</th>
                <th>keyword_norm</th>
                <th>priority_tier</th>
                <th>queue_suggested_page_level</th>
                <th>queue_keyword_axis</th>
                <th>queue_keyword_pattern</th>
                <th>validation_status</th>
                <th>cleanup_pipeline_status</th>
                <th>cleaned_keyword</th>
                <th>suggested_keyword</th>
                <th>should_validate_api</th>
                <th>should_hold</th>
                <th>warning_flags</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${asText(row.keyword, 'keyword')}-${index}`}>
                  <td>{asText(row.keyword)}</td>
                  <td>{asText(row.keyword_norm)}</td>
                  <td>{asText(row.priority_tier)}</td>
                  <td>{asText(row.queue_suggested_page_level)}</td>
                  <td>{asText(row.queue_keyword_axis)}</td>
                  <td>{asText(row.queue_keyword_pattern)}</td>
                  <td><span className={`status-pill ${getStatusClass(row.validation_status)}`}>{asText(row.validation_status)}</span></td>
                  <td><span className={`status-pill ${getStatusClass(row.cleanup_pipeline_status)}`}>{asText(row.cleanup_pipeline_status)}</span></td>
                  <td>{asText(row.cleaned_keyword)}</td>
                  <td>{asText(row.suggested_keyword)}</td>
                  <td>{asText(row.should_validate_api)}</td>
                  <td>{asText(row.should_hold)}</td>
                  <td>{asText(row.warning_flags)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
