import {
  confirmedProductComponents,
  hasWholeProductScope,
} from './seoProductPresentation.ts';

type KeywordRow = Record<string, unknown>;
type DecisionRow = Record<string, unknown>;

export const PRIMARY_KEYWORD_CONFLICT_BLOCKER = 'primary_keyword_portfolio_conflict';
export const PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER = 'primary_keyword_portfolio_map_unavailable';
export const PRIMARY_KEYWORD_PEER_REASSIGNMENT_PENDING = 'primary_keyword_peer_reassignment_pending';

export type SeoPrimaryKeywordAlternative = {
  keyword: string;
  keyword_norm: string;
  avg_monthly_searches: number | null;
  competition: string | null;
  metric_source: string | null;
  last_checked: string | null;
  reason: string;
};

export type SeoPrimaryKeywordConflict = {
  canonical_product_id: string;
  matched_etsy_listing_id: string | null;
  product_slug: string | null;
  decision_status: string | null;
  keyword: string;
  keyword_norm: string;
  current_selection_status?: string | null;
  current_primary_keyword?: string | null;
  current_primary_keyword_norm?: string | null;
  current_selection_error?: string | null;
};

export type SeoPrimaryKeywordOwnershipContract = {
  contract_version: 'seo_primary_keyword_ownership_v1';
  status: 'pass' | 'pass_with_pending_reassignment' | 'conflict' | 'not_checked';
  target_product_id: string;
  target_product_title: string | null;
  primary_keyword: string | null;
  primary_keyword_norm: string | null;
  compared_product_count: number;
  conflicts: SeoPrimaryKeywordConflict[];
  suggested_primary_alternatives: SeoPrimaryKeywordAlternative[];
  generation_blockers: string[];
  publish_blockers: string[];
  source: 'listing_master_latest_decisions';
  source_error: string | null;
  checked_at: string;
  limitations: string[];
  reserved_owner_product_id?: string | null;
};

export type SeoPrimaryOwnershipStrategy = Record<string, unknown> & {
  contract_version: 'seo_differentiation_strategy_v1';
  source: 'live_listing_master_primary_ownership';
  classification: 'PORTFOLIO_EXPANSION_OK' | 'DIFFERENTIATE_BEFORE_PUBLISH' | 'NEEDS_KEYWORD_REASSIGNMENT' | 'NEEDS_SOURCE_DATA_CLEANUP';
  risk_level: 'low' | 'medium' | 'high' | 'mapping';
  human_decision_needed: boolean;
  recommended_generation_mode: 'normal_generation' | 'normal_generation_primary_reserved' | 'blocked_pending_keyword_reassignment' | 'blocked_pending_portfolio_map';
  primary_angle_to_own: string | null;
  generation_blockers: string[];
  publish_blockers: string[];
  keyword_ownership: SeoPrimaryKeywordOwnershipContract;
};

export function buildSeoPrimaryKeywordOwnershipStrategy(input: {
  targetProductId: unknown;
  targetProductTitle?: unknown;
  primaryKeyword?: KeywordRow | string | null;
  secondaryKeywords?: KeywordRow[];
  productTruth?: unknown;
  decisionRows?: DecisionRow[];
  sourceError?: unknown;
  checkedAt?: string;
}): SeoPrimaryOwnershipStrategy | null {
  const targetProductId = clean(input.targetProductId);
  const primaryKeyword = keywordText(input.primaryKeyword);
  const primaryKeywordNorm = normalizeKeyword(primaryKeyword);
  if (!primaryKeywordNorm) return null;

  const checkedAt = input.checkedAt || new Date().toISOString();
  const latestDecisions = latestDecisionRows(input.decisionRows || []);
  const sourceError = clean(input.sourceError) || null;
  const usedPrimaryKeywords = collectUsedPrimaryKeywords(latestDecisions, targetProductId);
  const conflicts = sourceError
    ? []
    : usedPrimaryKeywords
      .filter((item) => item.keyword_norm === primaryKeywordNorm)
      .map((item) => ({
        canonical_product_id: item.canonical_product_id,
        matched_etsy_listing_id: item.matched_etsy_listing_id,
        product_slug: item.product_slug,
        decision_status: item.decision_status,
        keyword: item.keyword,
        keyword_norm: item.keyword_norm,
      }));

  const components = confirmedProductComponents(input.productTruth);
  const alternatives = (input.secondaryKeywords || [])
    .filter((item) => hasWholeProductScope(keywordText(item), components))
    .map((item) => alternativeFromKeyword(item))
    .filter((item) => item.keyword_norm && item.keyword_norm !== primaryKeywordNorm)
    .filter((item) => !usedPrimaryKeywords.some((used) => used.keyword_norm === item.keyword_norm))
    .sort(compareAlternatives)
    .slice(0, 5);

  const generationBlockers = sourceError
    ? [PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER]
    : conflicts.length
      ? [PRIMARY_KEYWORD_CONFLICT_BLOCKER]
      : [];
  const status: SeoPrimaryKeywordOwnershipContract['status'] = sourceError
    ? 'not_checked'
    : conflicts.length
      ? 'conflict'
      : 'pass';
  const ownership: SeoPrimaryKeywordOwnershipContract = {
    contract_version: 'seo_primary_keyword_ownership_v1',
    status,
    target_product_id: targetProductId,
    target_product_title: clean(input.targetProductTitle) || null,
    primary_keyword: primaryKeyword || null,
    primary_keyword_norm: primaryKeywordNorm || null,
    compared_product_count: Math.max(0, latestDecisions.length - (latestDecisions.some((row) => clean(row.canonical_product_id) === targetProductId) ? 1 : 0)),
    conflicts,
    suggested_primary_alternatives: alternatives,
    generation_blockers: generationBlockers,
    publish_blockers: generationBlockers,
    source: 'listing_master_latest_decisions',
    source_error: sourceError,
    checked_at: checkedAt,
    limitations: [
      'This preflight reserves exact Primary intent before OpenAI generation; it does not replace saved-draft copy similarity review.',
      'Secondary and long-tail overlap may be strategic and is reviewed later with page facts, copy, images and Search Console evidence.',
      'No keyword decision is changed automatically.',
    ],
  };

  const classification: SeoPrimaryOwnershipStrategy['classification'] = sourceError
    ? 'NEEDS_SOURCE_DATA_CLEANUP'
    : conflicts.length
      ? 'NEEDS_KEYWORD_REASSIGNMENT'
      : 'PORTFOLIO_EXPANSION_OK';
  const primaryAngle = primaryKeyword || null;
  const requiredDifferentiators = unique([
    primaryAngle ? `owned primary intent: ${primaryAngle}` : null,
    components.length ? `confirmed component set: ${components.join(', ')}` : null,
    productTruthValue(input.productTruth, 'color') ? `product color: ${productTruthValue(input.productTruth, 'color')}` : null,
    productTruthValue(input.productTruth, 'material') ? `product material: ${productTruthValue(input.productTruth, 'material')}` : null,
  ]);

  return {
    contract_version: 'seo_differentiation_strategy_v1',
    source: 'live_listing_master_primary_ownership',
    classification,
    risk_level: sourceError ? 'mapping' : conflicts.length ? 'high' : 'low',
    human_decision_needed: generationBlockers.length > 0,
    recommended_generation_mode: sourceError
      ? 'blocked_pending_portfolio_map'
      : conflicts.length
        ? 'blocked_pending_keyword_reassignment'
        : 'normal_generation',
    primary_angle_to_own: primaryAngle,
    agent_instruction_summary: conflicts.length
      ? `Do not generate until one product owns the exact Primary intent “${primaryKeyword}”.`
      : `The exact Primary intent “${primaryKeyword}” is not selected as Primary by another current Listing Master decision. Keep this page product-specific; saved-draft similarity review is still required before publish.`,
    title_strategy: 'Use the owned Primary naturally and add only verified product-specific differentiation.',
    h1_strategy: 'Keep one whole-product entity and one verified differentiator; do not copy another product title skeleton.',
    meta_strategy: 'Describe this product and its approved use case without stacking neighboring catalog intents.',
    body_strategy: 'Use confirmed product facts and a distinct opening; later saved-draft similarity QA remains mandatory.',
    keep_cluster_terms: primaryAngle ? [primaryAngle] : [],
    avoid_overusing_terms: [],
    required_differentiators: requiredDifferentiators,
    nearest_catalog_match: conflicts[0] ? {
      product_slug: conflicts[0].product_slug,
      title: conflicts[0].product_slug || conflicts[0].matched_etsy_listing_id || conflicts[0].canonical_product_id,
      overlap_pct: 100,
      shared_tokens: primaryKeywordNorm.split(' '),
    } : null,
    before_generation_checks: [
      'Reserve exactly one Primary intent per product page.',
      'Keep broad event/style terms available for collection or landing pages when appropriate.',
      'Run saved-draft similarity and image ALT truth gates before publish readiness.',
    ],
    generation_blockers: generationBlockers,
    publish_blockers: generationBlockers,
    keyword_ownership: ownership,
  };
}

export type SeoPeerKeywordSelectionState = {
  canonical_product_id: string;
  selection_status: string | null;
  primary_keyword: string | null;
  error?: string | null;
};

/**
 * A current, confirmed target decision may reserve the Primary for generation
 * when every matching peer has already been invalidated by its own Product
 * Truth/keyword re-audit. The peer still has to be reassigned before publish.
 * A second confirmed owner, or an unreadable peer state, remains a hard stop.
 */
export function resolveSeoPrimaryOwnershipWithCurrentSelections(
  strategy: SeoPrimaryOwnershipStrategy | null,
  input: {
    targetSelectionStatus?: unknown;
    peerSelections?: SeoPeerKeywordSelectionState[];
  },
): SeoPrimaryOwnershipStrategy | null {
  if (!strategy || strategy.keyword_ownership.status !== 'conflict') return strategy;
  const targetSelectionStatus = clean(input.targetSelectionStatus).toLowerCase();
  const peerById = new Map(
    (input.peerSelections || []).map((item) => [clean(item.canonical_product_id), item]),
  );
  const primaryNorm = strategy.keyword_ownership.primary_keyword_norm || '';
  let peerStateUnavailable = false;
  let confirmedPeerOwner = false;
  const conflicts = strategy.keyword_ownership.conflicts.map((conflict) => {
    const current = peerById.get(conflict.canonical_product_id);
    const currentStatus = clean(current?.selection_status).toLowerCase() || null;
    const currentPrimary = clean(current?.primary_keyword) || null;
    const currentPrimaryNorm = normalizeKeyword(currentPrimary);
    const currentError = clean(current?.error) || null;
    if (!current || currentError) peerStateUnavailable = true;
    if (currentStatus === 'confirmed' && currentPrimaryNorm === primaryNorm) {
      confirmedPeerOwner = true;
    }
    return {
      ...conflict,
      current_selection_status: currentStatus,
      current_primary_keyword: currentPrimary,
      current_primary_keyword_norm: currentPrimaryNorm || null,
      current_selection_error: currentError,
    };
  });

  const targetCanReserve = targetSelectionStatus === 'confirmed'
    && !peerStateUnavailable
    && !confirmedPeerOwner;
  if (!targetCanReserve) {
    const generationBlockers = unique([
      PRIMARY_KEYWORD_CONFLICT_BLOCKER,
      peerStateUnavailable ? PRIMARY_KEYWORD_MAP_UNAVAILABLE_BLOCKER : null,
    ]);
    return {
      ...strategy,
      generation_blockers: generationBlockers,
      publish_blockers: generationBlockers,
      keyword_ownership: {
        ...strategy.keyword_ownership,
        conflicts,
        generation_blockers: generationBlockers,
        publish_blockers: generationBlockers,
      },
    };
  }

  return {
    ...strategy,
    classification: 'DIFFERENTIATE_BEFORE_PUBLISH',
    risk_level: 'medium',
    human_decision_needed: true,
    recommended_generation_mode: 'normal_generation_primary_reserved',
    generation_blockers: [],
    publish_blockers: [PRIMARY_KEYWORD_PEER_REASSIGNMENT_PENDING],
    agent_instruction_summary: `This confirmed product provisionally owns the exact Primary intent “${strategy.keyword_ownership.primary_keyword}”. Matching peer decisions are not current and must receive a different whole-product Primary before publish.`,
    keyword_ownership: {
      ...strategy.keyword_ownership,
      status: 'pass_with_pending_reassignment',
      conflicts,
      suggested_primary_alternatives: [],
      generation_blockers: [],
      publish_blockers: [PRIMARY_KEYWORD_PEER_REASSIGNMENT_PENDING],
      reserved_owner_product_id: strategy.keyword_ownership.target_product_id,
    },
  };
}

export function getSeoPortfolioGenerationBlockers(strategy: unknown): string[] {
  if (!isRecord(strategy)) return [];
  const values = Array.isArray(strategy.generation_blockers)
    ? strategy.generation_blockers
    : [];
  return unique(values);
}

function latestDecisionRows(rows: DecisionRow[]) {
  const byProduct = new Map<string, DecisionRow>();
  [...rows]
    .sort((a, b) => timestamp(b) - timestamp(a))
    .forEach((row) => {
      const productId = clean(row.canonical_product_id);
      if (productId && !byProduct.has(productId)) byProduct.set(productId, row);
    });
  return [...byProduct.values()];
}

function collectUsedPrimaryKeywords(rows: DecisionRow[], targetProductId: string) {
  return rows.flatMap((row) => {
    const productId = clean(row.canonical_product_id);
    if (!productId || productId === targetProductId) return [];
    const keywords = Array.isArray(row.selected_keywords_json)
      ? row.selected_keywords_json.filter(isRecord)
      : [];
    return keywords
      .filter((item) => keywordRole(item) === 'primary')
      .map((item) => {
        const keyword = keywordText(item);
        return {
          canonical_product_id: productId,
          matched_etsy_listing_id: clean(row.matched_etsy_listing_id) || null,
          product_slug: clean(row.product_slug) || null,
          decision_status: clean(row.decision_status) || null,
          keyword,
          keyword_norm: normalizeKeyword(keyword),
        };
      })
      .filter((item) => item.keyword_norm);
  });
}

function alternativeFromKeyword(item: KeywordRow): SeoPrimaryKeywordAlternative {
  const keyword = keywordText(item);
  return {
    keyword,
    keyword_norm: normalizeKeyword(keyword),
    avg_monthly_searches: nullableNumber(item.avg_monthly_searches),
    competition: clean(item.competition) || null,
    metric_source: clean(item.metric_source) || null,
    last_checked: clean(item.last_checked) || null,
    reason: 'Validated whole-product Secondary that is not currently selected as another product Primary. Human confirmation is still required.',
  };
}

function compareAlternatives(a: SeoPrimaryKeywordAlternative, b: SeoPrimaryKeywordAlternative) {
  const aValidated = a.metric_source && a.last_checked ? 1 : 0;
  const bValidated = b.metric_source && b.last_checked ? 1 : 0;
  if (aValidated !== bValidated) return bValidated - aValidated;
  const volumeDifference = (b.avg_monthly_searches || 0) - (a.avg_monthly_searches || 0);
  if (volumeDifference) return volumeDifference;
  return a.keyword.localeCompare(b.keyword);
}

function keywordText(value: KeywordRow | string | null | undefined) {
  if (typeof value === 'string') return clean(value);
  if (!isRecord(value)) return '';
  return clean(value.keyword || value.keyword_norm);
}

function keywordRole(value: KeywordRow) {
  return clean(value.pilot_role || value.selected_role || value.role).toLowerCase();
}

function productTruthValue(value: unknown, key: string) {
  if (!isRecord(value)) return '';
  return clean(value[key]);
}

function normalizeKeyword(value: unknown) {
  return clean(value)
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function nullableNumber(value: unknown) {
  if (value == null || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function timestamp(row: DecisionRow) {
  return new Date(clean(row.updated_at || row.created_at) || 0).getTime();
}

function clean(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function unique(values: unknown[]) {
  return [...new Set(values.map(clean).filter(Boolean))];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
