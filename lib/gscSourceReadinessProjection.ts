/**
 * G1 — owner-only, deterministic *read projection* of the difference between
 * immutable first-party GSC receipts and the canonical source-health snapshot.
 *
 * This does NOT UPDATE source health, admit GMEL, start a role, fetch Google,
 * infer missing days as zero, or mutate the execution/capability registry.
 * Canonical health and observational L0 evidence are independent authorities.
 */
import type { DataSourceHealthRow } from './types.ts';
import {
  inspectOfficialGscReceipts,
  type GscQualityRow,
  type GscObservedQuality,
} from './gscObservedSourceQuality.ts';
import {
  inspectOfficialGscContinuity,
  type GscOfficialContinuity,
} from './gscReceiptContinuity.ts';

const SOURCE = 'ORGANIC_SEARCH_PERFORMANCE';
const CHANNEL = 'GOOGLE_GSC_OFFICIAL_READONLY';
const PROPERTY = 'sc-domain:thefeya.com';
const PRIMARY = 'GOOGLE_SEARCH_CONSOLE';
const INSTANCE = 'production';

export type GscEvidenceStatus =
  | 'UNAVAILABLE'
  | 'IDENTITY_MISMATCH'
  | 'INVALID_OFFICIAL_EVIDENCE'
  | 'NO_FINAL_DATE_ROWS'
  | 'PARTIAL_PROVIDER_COVERAGE'
  | 'STALE_OFFICIAL_L0'
  | 'RECENT_OFFICIAL_L0_NOT_PROMOTED';

export type GscRegistryStatus =
  | 'REGISTRY_MISSING'
  | 'IDENTITY_MISMATCH'
  | 'UNKNOWN_REGISTRY_CLOCK_OR_POLICY'
  | 'STALE_REGISTRY'
  | 'REGISTRY_SNAPSHOT_CURRENT';

export type GscReconciliation = {
  evidenceStatus: GscEvidenceStatus;
  registryStatus: GscRegistryStatus;
  evidenceLevel: 'L0' | 'NONE';
  canonicalHealthState: string;
  canonicalFreshnessState: string;
  canonicalCheckedAt: string | null;
  expectedRegistryMaxAgeSeconds: number | null;
  sourceIdentity: typeof SOURCE;
  officialProperty: typeof PROPERTY;
  lastReceiptId: string | null;
  recordedAt: string | null;
  periodEnd: string | null;
  finalizedThrough: string | null;
  expectedFinalDate: string | null;
  missingDays: number | null;
  uncoveredFinalDays: number | null;
  continuity: GscOfficialContinuity;
  quality: GscObservedQuality;
  reasonCodes: string[];
  /** These two are NEVER delegated on the basis of this projection. */
  canonicalSourceHealthyFromL0: false;
  gmelAdmittedFromL0: false;
};

function timeOrNull(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

export function reconcileGscSourceReadiness(
  receipts: readonly GscQualityRow[],
  registry: DataSourceHealthRow | null,
  now: Date = new Date(),
): GscReconciliation {
  const quality = inspectOfficialGscReceipts(receipts, now);
  const continuity = inspectOfficialGscContinuity(receipts, now);
  const official = receipts.filter((r) => r?.source_channel === CHANNEL)
    .sort((a, b) => String(b.query_end).localeCompare(String(a.query_end))
      || String(b.recorded_at).localeCompare(String(a.recorded_at))
      || String(b.payload_sha256).localeCompare(String(a.payload_sha256)));
  const latest = official[0] ?? null;

  // Explicitly check source identity. Never restrict the query to one
  // property *before* validation, as that would silently hide a mismatch.
  const receiptIdentityMismatch = official.some((r) =>
    r.property_url !== PROPERTY || r.search_type !== 'web' || r.data_state !== 'final');
  const registryIdentityMismatch = registry !== null &&
    (registry.source_code !== SOURCE || registry.primary_source !== PRIMARY ||
      registry.source_instance_key !== INSTANCE);
  const checkedAt = registry?.checked_at ?? null;
  const checkedMs = timeOrNull(checkedAt);
  const maxAge = registry?.expected_max_age_seconds;
  const validAge = typeof maxAge === 'number' && Number.isSafeInteger(maxAge) && maxAge > 0;
  const registryStatus: GscRegistryStatus = !registry
    ? 'REGISTRY_MISSING'
    : registryIdentityMismatch ? 'IDENTITY_MISMATCH'
    : checkedMs === null || !validAge || checkedMs > now.getTime() + 30000
      ? 'UNKNOWN_REGISTRY_CLOCK_OR_POLICY'
      : now.getTime() - checkedMs > maxAge! * 1000
        ? 'STALE_REGISTRY'
        : 'REGISTRY_SNAPSHOT_CURRENT';

  let evidenceStatus: GscEvidenceStatus;
  if (receiptIdentityMismatch || registryIdentityMismatch) {
    evidenceStatus = 'IDENTITY_MISMATCH';
  } else if (quality.state === 'INVALID_OFFICIAL_OBSERVATION' ||
    continuity.state === 'UNVERIFIED_EVIDENCE') {
    evidenceStatus = 'INVALID_OFFICIAL_EVIDENCE';
  } else if (quality.state === 'NO_OFFICIAL_OBSERVATION') {
    evidenceStatus = 'UNAVAILABLE';
  } else if (quality.state === 'NO_FINAL_DATE_ROWS') {
    evidenceStatus = 'NO_FINAL_DATE_ROWS';
  } else if (quality.state === 'PARTIAL_PROVIDER_COVERAGE') {
    evidenceStatus = 'PARTIAL_PROVIDER_COVERAGE';
  } else if (quality.state === 'OUTDATED_OFFICIAL_OBSERVATION') {
    evidenceStatus = 'STALE_OFFICIAL_L0';
  } else {
    evidenceStatus = 'RECENT_OFFICIAL_L0_NOT_PROMOTED';
  }

  const evidenceLevel = ['RECENT_OFFICIAL_L0_NOT_PROMOTED',
    'STALE_OFFICIAL_L0', 'PARTIAL_PROVIDER_COVERAGE'].includes(evidenceStatus)
    ? 'L0' as const : 'NONE' as const;
  const reasonCodes: string[] = [evidenceStatus, registryStatus];
  if (continuity.state === 'INSUFFICIENT_HISTORY' ||
      continuity.state === 'NO_SHARED_DATES') reasonCodes.push(continuity.state);
  if (continuity.state === 'OVERLAP_REVISED') reasonCodes.push('PROVIDER_REVISED_SHARED_DAYS');
  if (registry?.health_state === 'UNAVAILABLE' || registry?.freshness_state === 'UNKNOWN')
    reasonCodes.push('CANONICAL_SOURCE_UNAVAILABLE_OR_UNVERIFIED');

  return {
    evidenceStatus, registryStatus, evidenceLevel,
    canonicalHealthState: registry?.health_state ?? 'UNKNOWN',
    canonicalFreshnessState: registry?.freshness_state ?? 'UNKNOWN',
    canonicalCheckedAt: checkedAt,
    expectedRegistryMaxAgeSeconds: validAge ? maxAge : null,
    sourceIdentity: SOURCE, officialProperty: PROPERTY,
    lastReceiptId: evidenceLevel === 'L0' ? quality.receiptId : null,
    recordedAt: evidenceLevel === 'L0' ? quality.recordedAt : null,
    periodEnd: evidenceLevel === 'L0' ? quality.finalDate : null,
    finalizedThrough: evidenceLevel === 'L0' ? (latest?.finalized_through ?? null) : null,
    expectedFinalDate: quality.expectedFinalDate,
    missingDays: evidenceLevel === 'L0' ? quality.missingDays : null,
    uncoveredFinalDays: evidenceLevel === 'L0' ? quality.uncoveredFinalDays : null,
    continuity, quality, reasonCodes,
    canonicalSourceHealthyFromL0: false,
    gmelAdmittedFromL0: false,
  };
}
