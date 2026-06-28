import Link from 'next/link';
import { getMissingSupabaseEnvMessage, getSupabaseReadClient } from '@/lib/supabase';
import type { SeoKeywordCleanupReportRow } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SEO_KEYWORDS_LIMIT = 500;

const FILTERS = [
  { key: 'cleanup_pipeline_status', label: 'cleanup_pipeline_status' },
  { key: 'validation_status', label: 'validation_status' },
  { key: 'priority_tier', label: 'priority_tier' },
  { key: 'queue_suggested_page_level', label: 'page_level' },
] as const;

async function getSeoKeywordRows(): Promise<{ rows: SeoKeywordCleanupReportRow[]; totalCount: number | null; error?: string }> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return { rows: [], totalCount: null, error: getMissingSupabaseEnvMessage() };
  }

  const { data, error, count } = await supabase
    .from('feya_commerce_v_seo_keyword_ai_cleanup_report_v1')
    .select('*', { count: 'exact' })
    .limit(SEO_KEYWORDS_LIMIT);

  if (error) {
    return { rows: [], totalCount: null, error: error.message };
  }

  return { rows: (data || []) as SeoKeywordCleanupReportRow[], totalCount: count };
}

function asText(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value);
}

function normalizeStatus(value: unknown) {
  return asText(value, '').trim().toLowerCase();
}

function countByField(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow, value: string) {
  return rows.filter((row) => normalizeStatus(row[key]) === value).length;
}

function countTrue(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return rows.filter((row) => row[key] === true).length;
}

function getUniqueValues(rows: SeoKeywordCleanupReportRow[], key: keyof SeoKeywordCleanupReportRow) {
  return Array.from(new Set(rows.map((row) => asText(row[key], '')).filter(Boolean))).slice(0, 10);
}

function getStatusClass(value: unknown) {
  const normalized = normalizeStatus(value);

  if (normalized.includes('ready') || normalized.includes('approved') || normalized.includes('clean')) {
    return 'ok';
  }

  if (normalized.includes('hold') || normalized.includes('error') || normalized.includes('reject')) {
    return 'danger';
  }

  return 'warning';
}

export default async function AdminSeoKeywordsPage() {
  const { rows, totalCount, error } = await getSeoKeywordRows();
  const isPartialLoad = totalCount != null && rows.length < totalCount;

  const metrics = [
    { label: 'Total queue rows', value: totalCount ?? rows.length },
    { label: 'Rows loaded', value: rows.length },
    { label: 'needs_human_review', value: countByField(rows, 'cleanup_pipeline_status', 'needs_human_review') },
    { label: 'validation queued', value: countByField(rows, 'validation_status', 'queued') },
    { label: 'should_validate_api', value: countTrue(rows, 'should_validate_api') },
    { label: 'should_hold', value: countTrue(rows, 'should_hold') },
    { label: 'tier_1', value: countByField(rows, 'priority_tier', 'tier_1') },
    { label: 'tier_2', value: countByField(rows, 'priority_tier', 'tier_2') },
  ];

  return (
    <main className="page-shell">
      <div className="container">
        <nav className="top-nav">
          <Link href="/admin" className="brand-mark">TheFEYA Admin</Link>
          <div className="nav-links">
            <Link href="/admin/review">Review</Link>
            <Link href="/admin/products">Products</Link>
            <Link href="/admin/seo-keywords">SEO Keywords</Link>
            <Link href="/shop">Shop</Link>
          </div>
        </nav>

        <section className="phase-banner">
          <div className="phase-label">SEO keyword validation gate</div>
          <h1>SEO Keywords</h1>
          <p>
            Current queue candidates are not final SEO keywords. They must pass real metric validation, product/DNA fit checks, anti-cannibalization review, and human approval before they can be used for titles, descriptions, image alt text, or collections.
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

        {!error ? (
          <section className="notice">
            <strong>Current decision:</strong> do not run blind AI cleanup or final scoring from this queue. The confirmed Supabase state is human review + metric validation first. OpenAI can help normalize intent and warnings, but it must not invent search volume, competition, CTR, bids, trend, or seasonality metrics.
            {isPartialLoad ? ` This page loaded ${rows.length} of ${totalCount} rows, so row-level status counts are partial.` : ' The current limit is enough to load the confirmed queue snapshot.'}
          </section>
        ) : null}

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
                  <td><span className={`status-pill ${getStatusClass(row.priority_tier)}`}>{asText(row.priority_tier)}</span></td>
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
