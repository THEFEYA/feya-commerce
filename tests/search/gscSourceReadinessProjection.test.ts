import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileGscSourceReadiness } from '../../lib/gscSourceReadinessProjection.ts';
import type { GscQualityRow } from '../../lib/gscObservedSourceQuality.ts';
import type { DataSourceHealthRow } from '../../lib/types.ts';

const now = new Date('2026-10-18T14:00:00Z');
const prevId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const lastId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

type Day = { date: string; clicks: number; impressions: number; position: number };
const d12: Day = { date: '2026-10-12', clicks: 0, impressions: 1, position: 8 };
const d13: Day = { date: '2026-10-13', clicks: 1, impressions: 4, position: 9 };
const d14: Day = { date: '2026-10-14', clicks: 0, impressions: 2, position: 6 };
const d15: Day = { date: '2026-10-15', clicks: 0, impressions: 12, position: 5 };

const oldRegistry: DataSourceHealthRow = {
  source_code: 'ORGANIC_SEARCH_PERFORMANCE',
  primary_source: 'GOOGLE_SEARCH_CONSOLE',
  source_instance_key: 'production',
  health_state: 'UNAVAILABLE',
  freshness_state: 'UNKNOWN',
  expected_max_age_seconds: 172800,
  checked_at: '2026-09-18T10:08:59.522Z',
};
function receipt(id: string, days: Day[], recorded: string,
  changes: Partial<GscQualityRow> = {}): GscQualityRow {
  const clicks = days.reduce((sum, d) => sum + d.clicks, 0);
  const impressions = days.reduce((sum, d) => sum + d.impressions, 0);
  return {
    receipt_id: id,
    source_channel: 'GOOGLE_GSC_OFFICIAL_READONLY',
    property_url: 'sc-domain:thefeya.com',
    search_type: 'web',
    data_state: 'final',
    query_start: days[0].date,
    query_end: days[days.length - 1].date,
    finalized_through: days[days.length - 1].date,
    observed_days: days.length,
    daily_rows_json: days,
    clicks_total: clicks,
    impressions_total: impressions,
    average_position: impressions === 0 ? null :
      days.reduce((sum, d) => sum + d.position * d.impressions, 0) / impressions,
    payload_sha256: id === prevId ? 'a'.repeat(64) : 'b'.repeat(64),
    recorded_at: recorded,
    source_health_promoted: false,
    ...changes,
  };
}
const previous = receipt(prevId, [d12, d13, d14], '2026-10-17T10:00:00Z');
const latest = receipt(lastId, [d13, d14, d15], '2026-10-18T10:00:00Z');

test('live-like two-window official GSC evidence is L0 and registry remains separately STALE', () => {
  const result = reconcileGscSourceReadiness([latest, previous], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'RECENT_OFFICIAL_L0_NOT_PROMOTED');
  assert.equal(result.registryStatus, 'STALE_REGISTRY');
  assert.equal(result.canonicalHealthState, 'UNAVAILABLE');
  assert.equal(result.canonicalFreshnessState, 'UNKNOWN');
  assert.equal(result.periodEnd, '2026-10-15');
  assert.equal(result.finalizedThrough, '2026-10-15');
  assert.equal(result.expectedFinalDate, '2026-10-15');
  assert.equal(result.lastReceiptId, lastId);
  assert.equal(result.continuity.state, 'OVERLAP_MATCH');
  assert.equal(result.continuity.sharedObservedDays, 2);
  assert.equal(result.continuity.changedObservedDays, 0);
  assert.equal(result.evidenceLevel, 'L0');
  assert.equal(result.canonicalSourceHealthyFromL0, false);
  assert.equal(result.gmelAdmittedFromL0, false);
});

test('official one-shot without a second receipt remains L0 with insufficient history', () => {
  const result = reconcileGscSourceReadiness([latest], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'RECENT_OFFICIAL_L0_NOT_PROMOTED');
  assert.equal(result.continuity.state, 'INSUFFICIENT_HISTORY');
  assert.ok(result.reasonCodes.includes('INSUFFICIENT_HISTORY'));
});

test('manual/HYPD historical receipt cannot impersonate official evidence', () => {
  const result = reconcileGscSourceReadiness([
    { ...latest, source_channel: 'HYPD_MCP_READONLY_MANUAL' },
  ], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'UNAVAILABLE');
  assert.equal(result.lastReceiptId, null);
  assert.equal(result.evidenceLevel, 'NONE');
  assert.equal(result.gmelAdmittedFromL0, false);
});

test('missing provider days remain unknown, not synthesized zero', () => {
  const result = reconcileGscSourceReadiness([
    receipt(lastId, [d13, d15], '2026-10-18T10:00:00Z'),
  ], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'PARTIAL_PROVIDER_COVERAGE');
  assert.equal(result.missingDays, 1);
  assert.equal(result.quality.observedDays, 2);
  assert.equal(result.gmelAdmittedFromL0, false);
});

test('provider revision compares only shared dates, not shifted rolling totals', () => {
  const corrected = receipt(lastId, [d13, { ...d14, impressions: 3, position: 5 }, d15],
    '2026-10-18T10:00:00Z');
  const result = reconcileGscSourceReadiness([previous, corrected], oldRegistry, now);
  assert.equal(result.continuity.state, 'OVERLAP_REVISED');
  assert.equal(result.continuity.changedObservedDays, 1);
  assert.ok(result.reasonCodes.includes('PROVIDER_REVISED_SHARED_DAYS'));
});

test('wrong official property or search type fails closed rather than disappearing in query filter', () => {
  for (const bad of [
    { property_url: 'sc-domain:another.com' },
    { search_type: 'image' },
    { data_state: 'all' },
  ]) {
    const result = reconcileGscSourceReadiness([{ ...latest, ...bad }], oldRegistry, now);
    assert.equal(result.evidenceStatus, 'IDENTITY_MISMATCH');
    assert.equal(result.evidenceLevel, 'NONE');
    assert.equal(result.lastReceiptId, null);
  }
});

test('wrong registry source identity cannot authorize evidence', () => {
  const result = reconcileGscSourceReadiness([latest, previous],
    { ...oldRegistry, source_instance_key: 'legacy-shopify' }, now);
  assert.equal(result.registryStatus, 'IDENTITY_MISMATCH');
  assert.equal(result.evidenceStatus, 'IDENTITY_MISMATCH');
  assert.equal(result.gmelAdmittedFromL0, false);
});

test('invalid SHA, duplicated official receipt ID and future data fail closed', () => {
  const cases = [
    [receipt(lastId, [d13, d14, d15], '2026-10-18T10:00:00Z',
      { payload_sha256: 'invalid' })],
    [latest, { ...previous, receipt_id: lastId }],
    [receipt(lastId, [d13, d14, d15], '2026-10-18T16:00:00Z')],
  ];
  for (const receipts of cases) {
    const result = reconcileGscSourceReadiness(receipts, oldRegistry, now);
    assert.equal(result.evidenceStatus, 'INVALID_OFFICIAL_EVIDENCE');
    assert.equal(result.gmelAdmittedFromL0, false);
  }
});

test('no GSC date rows means unknown search metrics, never 0', () => {
  const result = reconcileGscSourceReadiness([{
    ...latest,
    observed_days: 0,
    daily_rows_json: [],
    clicks_total: null,
    impressions_total: null,
    average_position: null,
  }], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'NO_FINAL_DATE_ROWS');
  assert.equal(result.quality.clicks, null);
  assert.equal(result.evidenceLevel, 'NONE');
});

test('registry freshness is a distinct clock and requires a policy', () => {
  const current = reconcileGscSourceReadiness([latest, previous], {
    ...oldRegistry, health_state: 'HEALTHY', freshness_state: 'FRESH',
    checked_at: '2026-10-18T10:00:00Z',
  }, now);
  assert.equal(current.registryStatus, 'REGISTRY_SNAPSHOT_CURRENT');
  assert.equal(current.canonicalHealthState, 'HEALTHY');
  assert.equal(current.gmelAdmittedFromL0, false); // Other admission authority, not this L0 read.
  const unknown = reconcileGscSourceReadiness([latest], {
    ...oldRegistry, expected_max_age_seconds: null,
  }, now);
  assert.equal(unknown.registryStatus, 'UNKNOWN_REGISTRY_CLOCK_OR_POLICY');
  assert.equal(reconcileGscSourceReadiness([latest], null, now).registryStatus,
    'REGISTRY_MISSING');
});

test('old final date is visible even if receipt was recorded recently', () => {
  const aged = receipt(lastId, [
    { date: '2026-10-03', clicks: 0, impressions: 1, position: 5 },
    { date: '2026-10-04', clicks: 0, impressions: 2, position: 6 },
  ], '2026-10-18T10:00:00Z');
  const result = reconcileGscSourceReadiness([aged], oldRegistry, now);
  assert.equal(result.evidenceStatus, 'STALE_OFFICIAL_L0');
  assert.equal(result.uncoveredFinalDays, 11);
  assert.equal(result.recordedAt, '2026-10-18T10:00:00Z');
});
