import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectOfficialGscContinuity,
} from '../../lib/gscReceiptContinuity.ts';
import type { GscQualityRow } from '../../lib/gscObservedSourceQuality.ts';

const now = new Date('2026-10-18T14:00:00Z');
const d12 = { date: '2026-10-12', clicks: 0, impressions: 1, position: 8 };
const d13 = { date: '2026-10-13', clicks: 1, impressions: 4, position: 9 };
const d14 = { date: '2026-10-14', clicks: 0, impressions: 2, position: 6 };
const d15 = { date: '2026-10-15', clicks: 0, impressions: 12, position: 5 };
type Day = typeof d12;

function receipt(
  id: string,
  days: Day[],
  recorded: string,
  change: Partial<GscQualityRow> = {},
): GscQualityRow {
  const impressions = days.reduce((n, day) => n + day.impressions, 0);
  const clicks = days.reduce((n, day) => n + day.clicks, 0);
  const position = impressions
    ? days.reduce((n, day) => n + day.position * day.impressions, 0) / impressions
    : null;
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
    average_position: position,
    payload_sha256: 'a'.repeat(64),
    recorded_at: recorded,
    source_health_promoted: false,
    ...change,
  };
}

const oldId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const newId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const old = receipt(oldId, [d12, d13, d14], '2026-10-17T10:00:00Z');
const latest = receipt(newId, [d13, d14, d15], '2026-10-18T10:00:00Z');

test('shifted final-day windows compare only common dates, never rolling-total differences', () => {
  const result = inspectOfficialGscContinuity([old, latest], now);
  assert.equal(result.state, 'OVERLAP_MATCH');
  assert.equal(result.latestReceiptId, newId);
  assert.equal(result.previousReceiptId, oldId);
  assert.equal(result.sharedObservedDays, 2);
  assert.equal(result.changedObservedDays, 0);
  assert.equal(result.changedImpressionDays, 0);
  assert.equal(result.canonicalSourceHealthy, false);
  assert.equal(result.gmElModelEligible, false);
});

test('late Google revisions are counted only on shared, actually returned days', () => {
  const corrected = receipt(newId, [d13, { ...d14, impressions: 3, position: 5 }, d15],
    '2026-10-18T10:00:00Z');
  const result = inspectOfficialGscContinuity([old, corrected], now);
  assert.equal(result.state, 'OVERLAP_REVISED');
  assert.equal(result.sharedObservedDays, 2);
  assert.equal(result.changedObservedDays, 1);
  assert.equal(result.changedClickDays, 0);
  assert.equal(result.changedImpressionDays, 1);
  assert.equal(result.changedPositionDays, 1);
});

test('missing Google dates remain absent, not manufactured as zero observations', () => {
  const missing = receipt(newId, [d13, d15], '2026-10-18T10:00:00Z');
  const result = inspectOfficialGscContinuity([old, missing], now);
  assert.equal(result.state, 'OVERLAP_MATCH');
  assert.equal(result.sharedObservedDays, 1);
  assert.equal(result.changedObservedDays, 0);
});

test('insufficient independent official history, not HYPD history, cannot prove continuity', () => {
  const manual = receipt(oldId, [d12, d13, d14], '2026-10-17T10:00:00Z',
    { source_channel: 'HYPD_MCP_READONLY_MANUAL' });
  const result = inspectOfficialGscContinuity([manual, latest], now);
  assert.equal(result.state, 'INSUFFICIENT_HISTORY');
  assert.equal(result.sharedObservedDays, null);
  assert.equal(result.canonicalSourceHealthy, false);
});

test('invalid receipt or reused identity fails closed', () => {
  assert.equal(inspectOfficialGscContinuity(
    [receipt(oldId, [d12, d13, d14], '2026-10-17T10:00:00Z',
      { payload_sha256: 'not-a-hash' }), latest], now
  ).state, 'UNVERIFIED_EVIDENCE');
  assert.equal(inspectOfficialGscContinuity([old, { ...latest, receipt_id: oldId }], now).state,
    'UNVERIFIED_EVIDENCE');
});

test('two disjoint valid snapshots cannot imply a continuity verdict', () => {
  const early = receipt(oldId, [
    { date: '2026-10-10', clicks: 0, impressions: 1, position: 5 },
    { date: '2026-10-11', clicks: 0, impressions: 1, position: 6 },
  ], '2026-10-17T10:00:00Z');
  const result = inspectOfficialGscContinuity([early, latest], now);
  assert.equal(result.state, 'NO_SHARED_DATES');
  assert.equal(result.sharedObservedDays, 0);
  assert.equal(result.changedObservedDays, null);
});
