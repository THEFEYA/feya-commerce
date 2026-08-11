type SeoDraftRecord = Record<string, any>;

export const SEO_PORTFOLIO_WARNING_THRESHOLD = 0.55;
export const SEO_PORTFOLIO_BLOCKER_THRESHOLD = 0.72;

const STOPWORDS = new Set([
  'a','an','and','are','as','at','be','by','can','for','from','in','into','is','it','of','on','or','the','this','to','with','your',
  'outfit','costume','fashion','wear','clothes','clothing','handmade','festival','rave','man','mens','men','women','womens','woman',
  'ready','review','draft','seo','pack','product','check','checked','thefeya','original','studio','design','designed','made','make',
  'giving','planning','piece','pieces','style','styling','look',
]);

const PRODUCT_KEYWORD_ROLES = ['primary', 'secondary', 'support', 'image_alt'];

/**
 * Compare one representative draft per other canonical product. An approved
 * draft is the strongest representation of a product; otherwise use its most
 * recent draft. Older retries for the same URL must not multiply one overlap
 * signal or make a single product look like several competing pages.
 */
export function selectSeoPortfolioComparisonDrafts(
  drafts: SeoDraftRecord[],
  currentCanonicalProductId?: string | null,
) {
  const byProduct = new Map<string, SeoDraftRecord>();
  for (const draft of drafts || []) {
    const productId = String(draft?.canonical_product_id || '').trim();
    if (!productId || productId === currentCanonicalProductId) continue;
    const existing = byProduct.get(productId);
    if (!existing || isPreferredComparisonDraft(draft, existing)) {
      byProduct.set(productId, draft);
    }
  }
  return [...byProduct.values()];
}

export function runSeoPortfolioOverlapCheck(
  currentDraft: SeoDraftRecord,
  candidateDrafts: SeoDraftRecord[],
  checkedAt = new Date().toISOString(),
) {
  const currentTokens = tokenizeSeoPortfolioDraft(currentDraft);
  const candidates = selectSeoPortfolioComparisonDrafts(
    candidateDrafts,
    String(currentDraft?.canonical_product_id || '').trim(),
  );
  const matches = candidates.map((candidate) => {
    const candidateTokens = tokenizeSeoPortfolioDraft(candidate);
    const shared = [...currentTokens].filter((token) => candidateTokens.has(token));
    const unionSize = new Set([...currentTokens, ...candidateTokens]).size || 1;
    const jaccard = shared.length / unionSize;
    const targetCoverage = currentTokens.size ? shared.length / currentTokens.size : 0;
    const score = Math.max(jaccard, targetCoverage * 0.82);
    return {
      draft_id: candidate.id,
      canonical_product_id: candidate.canonical_product_id,
      product_slug: candidate.product_slug,
      status: candidate.status,
      review_status: candidate.review_status,
      similarity_pct: roundPct(score),
      jaccard_pct: roundPct(jaccard),
      target_coverage_pct: roundPct(targetCoverage),
      shared_tokens: shared.slice(0, 30),
    };
  }).sort((a, b) => b.similarity_pct - a.similarity_pct);

  const max = matches[0]?.similarity_pct || 0;
  const status = max >= SEO_PORTFOLIO_BLOCKER_THRESHOLD * 100
    ? 'blocker'
    : max >= SEO_PORTFOLIO_WARNING_THRESHOLD * 100
      ? 'warning'
      : 'pass';

  return {
    contract_version: 'seo_portfolio_overlap_check_v2',
    method: 'customer_copy_and_product_keyword_overlap_v2',
    status,
    checked_at: checkedAt,
    thresholds: {
      warning_pct: roundPct(SEO_PORTFOLIO_WARNING_THRESHOLD),
      blocker_pct: roundPct(SEO_PORTFOLIO_BLOCKER_THRESHOLD),
    },
    target: {
      draft_id: currentDraft.id,
      canonical_product_id: currentDraft.canonical_product_id,
      product_slug: currentDraft.product_slug,
      token_count: currentTokens.size,
    },
    comparison_count: candidates.length,
    raw_draft_count: (candidateDrafts || []).length,
    max_similarity_pct: max,
    top_matches: matches.slice(0, 10),
    decision: status === 'pass'
      ? 'No other canonical product crossed the warning threshold after comparing customer copy and product-level keyword intent.'
      : 'Review overlap before publish readiness. Decide whether this is strategic cluster expansion or duplicate/conflict risk.',
    interpretation: [
      'Similarity is not automatically bad for Google SEO.',
      'A product cluster can expand when pages have distinct product truth, images, intent, and internal linking.',
      'The risk is exact duplication, unclear keyword ownership, and repeated buyer-facing copy across URLs.',
    ],
    limitations: [
      'This is a storage-draft preflight, not a full sitewide canonical similarity index yet.',
      'It compares one representative saved draft per canonical product and ignores metric provenance or review metadata.',
      'It does not use Google Search Console or GA4 performance feedback yet.',
      'It does not call OpenAI.',
    ],
  };
}

/**
 * Tokenize only customer-visible copy and product-level keyword phrases.
 * Metric source, competition, dates, role labels and hold/reject metadata are
 * provenance, not page content, and must never inflate cannibalization risk.
 */
export function tokenizeSeoPortfolioDraft(draft: SeoDraftRecord) {
  const output = isRecord(draft?.agent_output_snapshot)
    ? draft.agent_output_snapshot
    : {};
  const pdpBlocks = Array.isArray(output.pdp_blocks)
    ? output.pdp_blocks.flatMap((block: unknown) => (
        isRecord(block) ? [block.heading, block.body] : []
      ))
    : [];
  const imageAlts = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate: unknown) => (
        isRecord(candidate) ? candidate.alt_text : ''
      ))
    : Array.isArray(draft?.image_alt_candidates)
      ? draft.image_alt_candidates.map((candidate: unknown) => (
          isRecord(candidate) ? candidate.alt_text : candidate
        ))
      : [];
  const raw = [
    draft?.seo_title,
    draft?.h1,
    draft?.meta_description,
    draft?.intro,
    JSON.stringify(draft?.bullet_highlights || output.bullet_highlights || []),
    JSON.stringify(draft?.faq || output.faq || []),
    JSON.stringify(draft?.internal_linking_hints || output.internal_linking_hints || []),
    ...pdpBlocks,
    ...imageAlts,
    ...extractProductKeywordPhrases(draft?.keyword_roles_snapshot),
  ].filter(Boolean).join(' ');

  return new Set(String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim().replace(/^-+|-+$/g, ''))
    .filter((token) => token.length >= 4)
    .filter((token) => !STOPWORDS.has(token))
    .slice(0, 260));
}

function extractProductKeywordPhrases(snapshot: unknown) {
  if (!isRecord(snapshot)) return [];
  return PRODUCT_KEYWORD_ROLES.flatMap((role) => {
    const rows = snapshot[role];
    if (!Array.isArray(rows)) return [];
    return rows.map((row) => (
      isRecord(row) ? String(row.keyword_norm || row.keyword || '').trim() : ''
    )).filter(Boolean);
  });
}

function isPreferredComparisonDraft(candidate: SeoDraftRecord, existing: SeoDraftRecord) {
  const candidatePriority = comparisonDraftPriority(candidate);
  const existingPriority = comparisonDraftPriority(existing);
  if (candidatePriority !== existingPriority) return candidatePriority > existingPriority;
  return Date.parse(String(candidate?.created_at || '')) > Date.parse(String(existing?.created_at || ''));
}

function comparisonDraftPriority(draft: SeoDraftRecord) {
  if (draft?.status === 'approved_draft' || draft?.review_status === 'approved') return 3;
  if (draft?.review_status === 'changes_requested' || draft?.status === 'changes_requested') return 1;
  return 2;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function roundPct(value: number) {
  return Math.round(value * 1000) / 10;
}
