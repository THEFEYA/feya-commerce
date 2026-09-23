import assert from 'node:assert/strict';
import test from 'node:test';
import { hasTrustedSeoMetricSnapshot } from '../../lib/seoTrustedMetricSnapshot.ts';

const validSnapshot = {
  avg_monthly_searches: 90,
  competition: 'LOW',
  metric_source: 'google_keyword_planner',
  data_freshness_status: 'validated',
  last_checked: '2026-07-08',
};

test('accepts the canonical Keyword Bank source id used by the import workflow', () => {
  assert.equal(hasTrustedSeoMetricSnapshot(validSnapshot), true);
});

test('accepts dated manual CSV provenance but not unsupported trend-only provenance', () => {
  assert.equal(hasTrustedSeoMetricSnapshot({
    ...validSnapshot,
    metric_source: 'csv_manual',
    data_freshness_status: 'fresh_manual_import',
  }), true);
  assert.equal(hasTrustedSeoMetricSnapshot({
    ...validSnapshot,
    metric_source: 'google_trends',
  }), false);
});

test('rejects incomplete, stale or fictional metric evidence', () => {
  assert.equal(hasTrustedSeoMetricSnapshot({ ...validSnapshot, last_checked: null }), false);
  assert.equal(hasTrustedSeoMetricSnapshot({ ...validSnapshot, competition: 'UNKNOWN' }), false);
  assert.equal(hasTrustedSeoMetricSnapshot({ ...validSnapshot, avg_monthly_searches: 0 }), false);
  assert.equal(hasTrustedSeoMetricSnapshot({
    ...validSnapshot,
    data_freshness_status: 'api_not_connected',
  }), false);
});
