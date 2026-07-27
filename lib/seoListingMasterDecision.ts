type KeywordRow = Record<string, unknown>;

export const LISTING_MASTER_KEYWORD_SNAPSHOT_LIMIT = 35;

/**
 * Persists the evidence needed to reproduce and audit a Listing Master
 * decision. Generation must never receive a keyword without its metric source,
 * freshness, role and Product Truth fit.
 */
export function buildListingMasterKeywordSnapshot(
  rows: KeywordRow[],
  limit = LISTING_MASTER_KEYWORD_SNAPSHOT_LIMIT,
) {
  return rows.slice(0, limit).map((row) => ({
    id: row.id || null,
    keyword: row.keyword || row.keyword_norm || '',
    keyword_norm: row.keyword_norm || row.keyword || '',
    bank_bucket: row.bank_bucket || null,
    page_type: row.page_type || null,
    role: row.role || null,
    role_label: row.role_label || null,
    review_status: row.review_status || null,
    score: nullableNumber(row.score),
    avg_monthly_searches: nullableNumber(row.avg_monthly_searches),
    competition: row.competition || null,
    competition_index: nullableNumber(row.competition_index),
    region: row.region || null,
    language: row.language || null,
    metric_source: row.metric_source || null,
    last_checked: row.last_checked || null,
    match_score: nullableNumber(row.match_score),
    strategy_rank: nullableNumber(row.strategy_rank),
    recommendation_score: nullableNumber(row.recommendation_score),
    recommendation_reason: row.recommendation_reason
      || row.match_reasons
      || row.reason
      || row.notes
      || '',
    validation_status: row.validation_status || null,
    data_freshness_status: row.data_freshness_status || null,
    whole_product_intent: row.whole_product_intent === true,
    auto_recommendation: row.auto_recommendation === true,
    auto_recommendation_needs_human_confirmation:
      row.auto_recommendation_needs_human_confirmation === true,
  }));
}

export function listingMasterKeywordIds(rows: KeywordRow[]) {
  return rows.map((row) => String(row.id || '').trim()).filter(Boolean);
}

/**
 * A saved Listing Master decision is current only while the exact
 * operator-facing keyword selection and its roles are unchanged. This keeps
 * an older reviewed decision from silently authorizing generation after the
 * recommendation logic or Keyword Bank has produced a different shortlist.
 */
export function listingMasterKeywordSelectionSignature(rows: KeywordRow[]) {
  const entries = rows.map((row) => [
    String(row.id || '').trim(),
    normalizeKeyword(row.keyword_norm || row.keyword),
    String(row.role || '').trim().toLowerCase(),
  ].join(':'));
  return `listing-master-selection-v1|${entries.join('|')}`;
}

export function getListingMasterDecisionInvalidationBlockers(input: {
  hasPrimary: boolean;
  savedKeywordSelectionSignature: unknown;
  currentKeywordSelectionSignature: unknown;
  savedSellableOfferSignature: unknown;
  currentSellableOfferSignature: unknown;
  removedUnsupportedFocusComponents?: unknown[];
}) {
  const blockers: string[] = [];
  if (!input.hasPrimary) blockers.push('no_valid_pdp_primary');
  if (
    String(input.savedKeywordSelectionSignature || '')
    !== String(input.currentKeywordSelectionSignature || '')
  ) {
    blockers.push('keyword_roles_changed_after_reaudit');
  }
  if (
    String(input.currentSellableOfferSignature || '')
    && String(input.savedSellableOfferSignature || '')
      !== String(input.currentSellableOfferSignature || '')
  ) {
    blockers.push('stale_option_snapshot');
  }
  if (input.removedUnsupportedFocusComponents?.length) {
    blockers.push('manual_focus_contains_unsupported_component');
  }
  return blockers;
}

export function getListingMasterDecisionStatus(
  productTruthBlockers: string[],
  rows: KeywordRow[],
) {
  if (productTruthBlockers.length) return 'blocked_product_truth';
  if (!rows.length || !rows.some((row) => row.role === 'primary')) {
    return 'needs_keyword_review';
  }
  return 'draft';
}

export function getListingMasterKeywordSelection(
  decisionStatus: unknown,
) {
  const status = String(decisionStatus || '').trim().toLowerCase();
  if (status === 'blocked_product_truth') {
    return {
      mode: 'operator_decision' as const,
      status: 'blocked_product_truth' as const,
      confirmation_required: true,
    };
  }
  if (status === 'draft') {
    return {
      mode: 'operator_decision' as const,
      status: 'confirmed' as const,
      confirmation_required: false,
    };
  }
  return {
    mode: 'operator_decision' as const,
    status: 'needs_keyword_review' as const,
    confirmation_required: true,
  };
}

function nullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function normalizeKeyword(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
