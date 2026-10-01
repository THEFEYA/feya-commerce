type MetricRow = Record<string, unknown> | null | undefined;

const API_SOURCES = new Set([
  'dataforseo',
  'google ads',
  'google ads api',
  'google ads keyword planner',
  'google keyword planner',
]);

const MANUAL_SOURCES = new Set([
  'csv manual',
  'google ads csv',
  'keyword planner csv',
  'manual keyword planner import',
]);

const API_FRESHNESS = new Set(['api connected', 'fresh api', 'validated']);
const MANUAL_FRESHNESS = new Set(['fresh manual import', 'validated']);

/**
 * A selected keyword may authorize paid generation only when its demand and
 * competition are backed by an approved, dated metric snapshot. Source ids
 * are normalized because the existing import workflow stores canonical ids
 * such as `google_keyword_planner`, while older snapshots used display labels.
 */
export function hasTrustedSeoMetricSnapshot(row: MetricRow) {
  const volume = positiveNumber(row?.avg_monthly_searches);
  const competition = normalizeSeoMetricToken(row?.competition);
  const source = normalizeSeoMetricToken(metricSource(row));
  const freshness = normalizeSeoMetricToken(metricFreshness(row));
  const checkedAt = String(row?.last_checked || '').trim();

  if (!volume || !competition || competition === 'unknown' || !checkedAt) return false;
  if (!source || !freshness || freshness === 'api not connected') return false;

  if (API_SOURCES.has(source)) return API_FRESHNESS.has(freshness);
  if (MANUAL_SOURCES.has(source)) return MANUAL_FRESHNESS.has(freshness);
  if (source === 'erank') return API_FRESHNESS.has(freshness);
  return false;
}

export function normalizeSeoMetricToken(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function metricSource(row: MetricRow) {
  return row?.metric_source
    || row?.source_api
    || row?.validation_source
    || row?.source
    || '';
}

function metricFreshness(row: MetricRow) {
  return row?.data_freshness_status
    || row?.metric_freshness_status
    || row?.freshness_status
    || '';
}

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}
