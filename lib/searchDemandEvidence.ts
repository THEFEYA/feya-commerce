/** Planner demand validation is independent of legacy generation approvals. */
export type DemandEvidence = {
  keyword: string;
  source: 'google_ads_csv' | 'google_ads_api' | string;
  source_ref: string | null;
  market: string;
  language: string;
  network: string;
  fetched_at: string | null;
  period_start: string | null;
  period_end: string | null;
  avg_monthly_searches: number | null;
  search_volume_range: { low: number; high: number } | null;
  competition: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  competition_index: number | null;
  low_bid: number | null;
  high_bid: number | null;
  bid_currency_code: string | null;
};

export function normalizeResearchKeyword(keyword: string) {
  return keyword.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function validateDemandEvidence(row: DemandEvidence, context: {
  market: string; language: string; network: string; now: Date; max_age_days: number;
}) {
  if (!Number.isFinite(context.now.getTime()) || !Number.isFinite(context.max_age_days) || context.max_age_days < 0) throw new Error('Invalid freshness policy');
  const errors: string[] = [];
  const warnings: string[] = [];
  const keyword = normalizeResearchKeyword(row.keyword);
  if (!keyword || /_/.test(keyword)) errors.push('keyword_missing_or_internal_token');
  if (!['google_ads_csv', 'google_ads_api'].includes(row.source)) errors.push('not_google_demand_source');
  if (!row.source_ref?.trim()) errors.push('provenance_missing');
  if (row.market !== context.market || row.language !== context.language || row.network !== context.network) errors.push('targeting_context_mismatch');
  const fetched = row.fetched_at ? Date.parse(row.fetched_at) : NaN;
  const start = row.period_start ? Date.parse(row.period_start) : NaN;
  const end = row.period_end ? Date.parse(row.period_end) : NaN;
  if (!Number.isFinite(fetched) || fetched > context.now.getTime()) errors.push('capture_date_invalid');
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || end > fetched) errors.push('metric_period_invalid');
  const ageDays = Number.isFinite(fetched) ? (context.now.getTime() - fetched) / 86400000 : null;
  if (ageDays !== null && ageDays > context.max_age_days) warnings.push('snapshot_stale');
  const volume = row.avg_monthly_searches;
  if (volume !== null && (!Number.isSafeInteger(volume) || volume < 0)) errors.push('invalid_search_volume');
  const range = row.search_volume_range;
  if (range && (!Number.isSafeInteger(range.low) || !Number.isSafeInteger(range.high) || range.low < 0 || range.high < range.low)) errors.push('invalid_volume_range');
  if (volume !== null && range !== null) errors.push('ambiguous_volume_representation');
  if (volume === null && range === null) warnings.push('volume_unavailable');
  if (row.competition !== null && !['LOW', 'MEDIUM', 'HIGH'].includes(row.competition)) errors.push('invalid_ads_competition');
  if (row.competition_index !== null && (!Number.isFinite(row.competition_index) || row.competition_index < 0 || row.competition_index > 100)) errors.push('invalid_ads_competition_index');
  for (const bid of [row.low_bid, row.high_bid]) if (bid !== null && (!Number.isFinite(bid) || bid < 0)) errors.push('invalid_bid');
  if (row.low_bid !== null && row.high_bid !== null && row.low_bid > row.high_bid) errors.push('invalid_bid_range');
  if ((row.low_bid !== null || row.high_bid !== null) && !/^[A-Z]{3}$/.test(row.bid_currency_code || '')) errors.push('bid_currency_missing_or_invalid');
  return {
    keyword_norm: keyword,
    validation_status: errors.length ? 'invalid' as const : 'valid' as const,
    usable_for_current_demand_decision: errors.length === 0 && warnings.length === 0,
    errors: [...new Set(errors)], warnings,
    observed_age_days: ageDays,
    // Preserve zero, null, and ranges. Never impute a midpoint or organic KD.
    avg_monthly_searches: volume,
    search_volume_range: range,
    competition_meaning: 'advertiser_competition' as const,
  };
}
