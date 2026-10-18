/**
 * GDAE Phase 13 P0C: continuity of two immutable first-party GSC receipts.
 * Compare ONLY observed common calendar dates. Never use a shifted 14-day
 * rolling total as a trend, infer missing Google rows as zero, or promote
 * canonical source-health / paid GMEL eligibility.
 */
import { inspectOfficialGscReceipts, type GscQualityRow } from './gscObservedSourceQuality.ts';

export type GscContinuityState =
  | 'INSUFFICIENT_HISTORY'
  | 'UNVERIFIED_EVIDENCE'
  | 'NO_SHARED_DATES'
  | 'OVERLAP_MATCH'
  | 'OVERLAP_REVISED';

export type GscOfficialContinuity = {
  state: GscContinuityState;
  latestReceiptId: string | null;
  previousReceiptId: string | null;
  sharedObservedDays: number | null;
  changedObservedDays: number | null;
  changedClickDays: number | null;
  changedImpressionDays: number | null;
  changedPositionDays: number | null;
  canonicalSourceHealthy: false;
  gmElModelEligible: false;
};

function reliable(receipt: GscQualityRow, now: Date): boolean {
  const quality = inspectOfficialGscReceipts([receipt], now);
  return quality.receiptId === receipt.receipt_id &&
    ['OBSERVED_L0', 'PARTIAL_PROVIDER_COVERAGE', 'OUTDATED_OFFICIAL_OBSERVATION'].includes(quality.state) &&
    quality.canonicalSourceHealthy === false && quality.gmElModelEligible === false;
}

export function inspectOfficialGscContinuity(
  rows: readonly GscQualityRow[],
  now: Date = new Date(),
): GscOfficialContinuity {
  const official = rows.filter(
    r => r?.source_channel === 'GOOGLE_GSC_OFFICIAL_READONLY'
  ).sort((a, b) =>
    String(b.query_end).localeCompare(String(a.query_end)) ||
    String(b.recorded_at).localeCompare(String(a.recorded_at)) ||
    String(b.payload_sha256).localeCompare(String(a.payload_sha256))
  );
  const latest = official[0];
  const previous = official[1];
  const base: GscOfficialContinuity = {
    state: 'INSUFFICIENT_HISTORY',
    latestReceiptId: latest?.receipt_id ?? null,
    previousReceiptId: previous?.receipt_id ?? null,
    sharedObservedDays: null,
    changedObservedDays: null,
    changedClickDays: null,
    changedImpressionDays: null,
    changedPositionDays: null,
    canonicalSourceHealthy: false,
    gmElModelEligible: false,
  };
  if (!latest || !previous) return base;
  if (latest.receipt_id === previous.receipt_id ||
      !reliable(latest, now) || !reliable(previous, now)) {
    return { ...base, state: 'UNVERIFIED_EVIDENCE' };
  }

  const latestRows = latest.daily_rows_json as Array<{
    date: string; clicks: number; impressions: number; position: number;
  }>;
  const previousRows = previous.daily_rows_json as typeof latestRows;
  const before = new Map(previousRows.map(row => [row.date, row]));

  let shared = 0;
  let changed = 0;
  let clicksChanged = 0;
  let impressionsChanged = 0;
  let positionsChanged = 0;
  for (const row of latestRows) {
    const old = before.get(row.date);
    // An omitted Google day is UNKNOWN, never an observed zero.
    if (!old) continue;
    shared += 1;
    const clickChanged = row.clicks !== old.clicks;
    const impressionChanged = row.impressions !== old.impressions;
    const positionChanged = Math.abs(row.position - old.position) > 1e-8;
    if (clickChanged || impressionChanged || positionChanged) changed += 1;
    if (clickChanged) clicksChanged += 1;
    if (impressionChanged) impressionsChanged += 1;
    if (positionChanged) positionsChanged += 1;
  }

  return {
    ...base,
    state: shared === 0 ? 'NO_SHARED_DATES' : changed > 0 ? 'OVERLAP_REVISED' : 'OVERLAP_MATCH',
    sharedObservedDays: shared,
    changedObservedDays: shared === 0 ? null : changed,
    changedClickDays: shared === 0 ? null : clicksChanged,
    changedImpressionDays: shared === 0 ? null : impressionsChanged,
    changedPositionDays: shared === 0 ? null : positionsChanged,
  };
}
