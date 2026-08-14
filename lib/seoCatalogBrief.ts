import { mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';
import { isImageOnlySeoBucket } from '@/lib/seoKeywordBucket';
import type {
  SeoKeywordRoleGroup,
  SeoManualFocus,
  SeoMetricsStatus,
  SeoPilotBrief,
  SeoPilotKeyword,
  SeoPilotKeywordRole,
  SeoQaCheck,
  SeoScoringContract,
} from '@/lib/seoPilotDraft';

const COMMERCIAL_INTENT_PATTERN = /\b(buy|shop|shopping|order|online|price|cost|shipping|delivery|custom|made to order|where to buy|for sale|store|website)\b/i;
const QUESTION_INTENT_PATTERN = /^(how|what|when|where|which|can|does|do|is|are|why)\b/i;
const COLLECTION_BUCKET_PATTERN = /collection|landing|event|persona|style/i;

function normalize(value: unknown) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function text(value: unknown, fallback = '') {
  const result = String(value || '').trim();
  return result || fallback;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function splitFocus(value: unknown): string[] {
  if (Array.isArray(value)) return unique(value.flatMap(splitFocus));
  if (value == null) return [];
  return unique(String(value).split(/[|,;]+/).map(normalize).filter(Boolean));
}

function unique<T>(items: T[], keyOf: (item: T) => string = (item) => normalize(item)) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = keyOf(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function keywordText(keyword: SeoPilotKeyword) {
  return text(keyword.keyword || keyword.keyword_norm);
}

function hasValidatedMetric(keyword: SeoPilotKeyword) {
  return keyword.validation_status === 'validated'
    && Number(keyword.avg_monthly_searches || 0) > 0
    && Boolean(text(keyword.competition));
}

function rankingValue(keyword: SeoPilotKeyword) {
  const raw = keyword as SeoPilotKeyword & Record<string, unknown>;
  return [raw.strategy_rank, raw.match_score, raw.score, raw.avg_monthly_searches]
    .map(toNumber)
    .find((value) => value != null) || 0;
}

function focusExclusions(manualFocus: SeoManualFocus) {
  return splitFocus(manualFocus.exclude);
}

function containsExcludedIntent(keyword: SeoPilotKeyword, exclusions: string[]) {
  const value = normalize(keywordText(keyword));
  return exclusions.some((term) => value === term || value.includes(` ${term} `) || value.startsWith(`${term} `) || value.endsWith(` ${term}`));
}

function initialRole(keyword: SeoPilotKeyword, exclusions: string[]): SeoPilotKeywordRole {
  const value = keywordText(keyword);
  const bankBucket = normalize(keyword.bank_bucket);
  const pageType = normalize(keyword.page_type);
  const bucket = `${bankBucket} ${pageType}`.trim();
  const raw = keyword as SeoPilotKeyword & Record<string, unknown>;
  const rawRole = normalize(raw.role);
  const ownerReviewedPdpPrimary = rawRole === 'primary'
    && raw.owner_reviewed_pdp_primary === true;

  if (containsExcludedIntent(keyword, exclusions)) return 'reject';
  if (keyword.should_hold === true || !hasValidatedMetric(keyword)) return 'hold';
  if (bucket.includes('faq')) return 'faq_commercial';
  if (COMMERCIAL_INTENT_PATTERN.test(value) || QUESTION_INTENT_PATTERN.test(value)) return 'faq_commercial';
  if (ownerReviewedPdpPrimary) return 'primary';
  if (COLLECTION_BUCKET_PATTERN.test(bucket)) return 'collection';
  // `product_or_alt` remains a product query. It may later be reused for a
  // visually matching image, but `alt` in its bucket name must not demote it.
  if (rawRole === 'primary') return 'primary';
  if (rawRole === 'secondary') return 'secondary';
  if (rawRole === 'support' || rawRole === 'supporting') return 'support';
  if (rawRole === 'image alt' || rawRole === 'image_alt') return 'image_alt';
  if (rawRole === 'collection') return 'collection';
  if (rawRole === 'faq' || rawRole === 'faq commercial' || rawRole === 'faq_commercial') return 'faq_commercial';
  if (rawRole === 'reject') return 'reject';
  if (rawRole === 'hold') return 'hold';
  if (isImageOnlySeoBucket(bankBucket) || isImageOnlySeoBucket(pageType)) return 'image_alt';
  return 'secondary';
}

function assignCatalogRoles(keywords: SeoPilotKeyword[], manualFocus: SeoManualFocus) {
  const exclusions = focusExclusions(manualFocus);
  const rows = unique(keywords, (keyword) => normalize(keywordText(keyword)))
    .sort((a, b) => rankingValue(b) - rankingValue(a));
  let primaryAssigned = false;

  const assigned = rows.map((keyword) => {
    let role = initialRole(keyword, exclusions);
    if (role === 'primary') {
      if (primaryAssigned) role = 'secondary';
      else primaryAssigned = true;
    }
    return {
      ...keyword,
      pilot_role: role,
      pilot_role_reason: roleReason(role),
    };
  });

  if (!primaryAssigned) {
    const firstProductCandidate = assigned.find((keyword) => ['secondary', 'support'].includes(keyword.pilot_role || ''));
    if (firstProductCandidate) {
      firstProductCandidate.pilot_role = 'primary';
      firstProductCandidate.pilot_role_reason = roleReason('primary');
    }
  }

  return assigned;
}

function roleReason(role: SeoPilotKeywordRole) {
  const reasons: Record<SeoPilotKeywordRole, string> = {
    primary: 'Highest ranked operator-selected product keyword with approved Keyword Bank metrics.',
    secondary: 'Operator-selected product keyword supporting the primary product intent.',
    support: 'Approved supporting phrase for natural semantic coverage.',
    image_alt: 'Approved image/ALT candidate; it still requires visible-image truth before use.',
    collection: 'Broad event/style/persona intent reserved for internal links or future landing pages.',
    faq_commercial: 'Commercial or question intent reserved for supported meta/body/FAQ placement, not title stuffing.',
    hold: 'Missing trusted metrics or explicitly held for review.',
    reject: 'Conflicts with the operator exclusion list for this product.',
  };
  return reasons[role];
}

function roleGroups(keywords: SeoPilotKeyword[]): SeoKeywordRoleGroup[] {
  const meta: Array<{ role: SeoPilotKeywordRole; label: string; purpose: string }> = [
    { role: 'primary', label: 'Primary', purpose: 'One owned product query for SEO title, H1, meta and natural body coverage.' },
    { role: 'secondary', label: 'Secondary', purpose: 'Strong product-level support without competing with the primary query.' },
    { role: 'support', label: 'Support', purpose: 'Natural semantic context for useful human copy.' },
    { role: 'image_alt', label: 'Image ALT', purpose: 'Only for a specific image after visual truth confirms the phrase.' },
    { role: 'collection', label: 'Collection / internal', purpose: 'Broad intent for future landing pages and internal linking.' },
    { role: 'faq_commercial', label: 'FAQ / commercial', purpose: 'Buy/order/online/shipping/delivery intent in supported conversion or FAQ copy.' },
    { role: 'hold', label: 'Hold', purpose: 'No trusted metrics or needs operator review.' },
    { role: 'reject', label: 'Reject', purpose: 'Conflicts with the product-specific exclusion list.' },
  ];
  return meta
    .map((item) => ({ ...item, items: keywords.filter((keyword) => keyword.pilot_role === item.role) }))
    .filter((group) => group.items.length > 0);
}

function metricsStatus(keywords: SeoPilotKeyword[]): SeoMetricsStatus {
  const validatedCount = keywords.filter(hasValidatedMetric).length;
  const missingMetricCount = keywords.length - validatedCount;
  const unknownCompetitionCount = keywords.filter((keyword) => normalize(keyword.competition) === 'unknown').length;
  const status = validatedCount >= 3 ? 'validated' : validatedCount > 0 ? 'partial' : 'missing';
  return {
    status,
    totalKeywords: keywords.length,
    validatedCount,
    missingMetricCount,
    unknownCompetitionCount,
    note: validatedCount
      ? `${validatedCount} operator-selected keywords were re-confirmed against the approved Keyword Bank metrics.`
      : 'No selected keyword was re-confirmed against an approved metric-bearing Keyword Bank row.',
  };
}

function scoringContract(): SeoScoringContract {
  const factors = [
    { id: 'product_truth_fit', label: 'Product Truth fit', maxPoints: 30, purpose: 'Product truth and operator focus outrank raw search volume.', requiredInputs: ['Product Truth', 'manual focus', 'match reasons'] },
    { id: 'buyer_intent_fit', label: 'Buyer intent', maxPoints: 15, purpose: 'Separate product, commercial, image and collection intent.', requiredInputs: ['bank bucket', 'page type', 'keyword wording'] },
    { id: 'search_demand', label: 'Search demand', maxPoints: 18, purpose: 'Use approved Google/CSV metrics only.', requiredInputs: ['avg_monthly_searches', 'metric_source', 'last_checked'] },
    { id: 'competition_opportunity', label: 'Competition opportunity', maxPoints: 12, purpose: 'Support demand, opportunity and niche strategies.', requiredInputs: ['competition', 'competition_index', 'strategy rank'] },
    { id: 'placement_fit', label: 'Placement fit', maxPoints: 8, purpose: 'Keep product, FAQ, ALT and collection phrases in the correct fields.', requiredInputs: ['role', 'page type'] },
    { id: 'cannibal_safety', label: 'Cannibalization safety', maxPoints: 10, purpose: 'Reserve one primary query per product after portfolio comparison.', requiredInputs: ['portfolio overlap', 'primary ownership'] },
  ];
  return {
    status: 'waiting_for_metrics',
    formula: 'Product Truth gate -> operator focus/strategy -> approved Keyword Bank metrics -> role placement -> portfolio ownership.',
    totalMaxScore: factors.reduce((sum, factor) => sum + factor.maxPoints, 0),
    factors,
    requiredMetricFields: ['avg_monthly_searches', 'competition', 'metric_source', 'last_checked'],
    hardGates: [
      'Product Truth outranks search volume.',
      'Only approved metric-bearing Keyword Bank rows may become primary or secondary.',
      'Commercial intent is placement-sensitive and is not forced into the SEO title.',
      'Image ALT candidates require visible truth for the exact image.',
      'Final primary ownership requires portfolio/cannibalization review.',
    ],
    decisionRules: [
      { role: 'primary', label: 'Primary', rule: 'One operator-selected product query with approved metrics.' },
      { role: 'secondary', label: 'Secondary', rule: 'Product-level support with approved metrics.' },
      { role: 'supporting', label: 'Supporting', rule: 'Natural semantic context.' },
      { role: 'long_tail', label: 'Long-tail', rule: 'Specific product query used only when Product Truth supports it.' },
      { role: 'image_alt', label: 'Image ALT', rule: 'Use only after image-level visual confirmation.' },
      { role: 'faq', label: 'FAQ / commercial', rule: 'Supported buy/order/online/shipping/delivery questions and answers.' },
      { role: 'collection', label: 'Collection', rule: 'Broad intent reserved for future landing pages/internal links.' },
      { role: 'hold', label: 'Hold', rule: 'Missing trusted metric or requires review.' },
      { role: 'reject', label: 'Reject', rule: 'Conflicts with product-specific exclusions.' },
    ],
  };
}

function qaChecks(product: StorefrontProduct, keywords: SeoPilotKeyword[], metrics: SeoMetricsStatus): SeoQaCheck[] {
  const hasPrimary = keywords.some((keyword) => keyword.pilot_role === 'primary');
  const hasImage = Boolean(product.primary_image_url);
  const hasRejectedSelected = keywords.some((keyword) => keyword.pilot_role === 'reject');
  return [
    { id: 'cliche_phrase', label: 'AI clichés / water', status: 'warning', note: 'Checked deterministically after generation; the model self-report is not sufficient.' },
    { id: 'long_dash', label: 'Long dash', status: 'warning', note: 'Checked deterministically after generation.' },
    { id: 'keyword_stuffing', label: 'Keyword stuffing', status: 'warning', note: 'Exact placement and repetition are checked against the selected role map after generation.' },
    { id: 'product_specificity', label: 'Product specificity', status: productTitle(product) ? 'pass' : 'blocker', note: productTitle(product) ? 'Canonical product identity is present.' : 'Product title is missing.' },
    { id: 'forbidden_mismatch', label: 'Product mismatch', status: hasRejectedSelected ? 'blocker' : 'pass', note: hasRejectedSelected ? 'At least one selected keyword conflicts with the product-specific exclusion list.' : 'No selected keyword conflicts with the operator exclusion list.' },
    { id: 'similarity_cannibalization', label: 'Cannibalization', status: 'warning', note: 'Final primary ownership requires saved-draft and source-catalog overlap review.' },
    { id: 'image_alt_truth', label: 'Image ALT truth', status: hasImage ? 'warning' : 'blocker', note: hasImage ? 'Primary image exists; every final ALT still requires image-level truth review.' : 'Primary image is missing.' },
    { id: 'commercial_placement', label: 'Commercial placement', status: 'pass', note: 'Commercial phrases are assigned to FAQ/commercial placement and kept out of title ownership.' },
    { id: 'validated_metrics', label: 'Validated metrics', status: metrics.validatedCount > 0 && hasPrimary ? 'pass' : 'blocker', note: metrics.note },
  ];
}

function roleItems(groups: SeoKeywordRoleGroup[], role: SeoPilotKeywordRole) {
  return groups.find((group) => group.role === role)?.items || [];
}

function buildPreview(product: StorefrontProduct, groups: SeoKeywordRoleGroup[], manualFocus: SeoManualFocus) {
  const title = productTitle(product);
  const primary = roleItems(groups, 'primary')[0];
  const secondary = roleItems(groups, 'secondary');
  const commercial = roleItems(groups, 'faq_commercial');
  const collection = roleItems(groups, 'collection');
  const imageAlt = roleItems(groups, 'image_alt');
  const blockedWords = focusExclusions(manualFocus);
  const primaryText = keywordText(primary) || title;

  return {
    seoTitle: primaryText,
    h1: title,
    metaDescription: `Use ${primaryText} naturally with one supported product differentiator and buyer use case.`,
    intro: `Open with the product identity and supported buyer value. Do not expose audit language or keyword selection mechanics.`,
    bullets: secondary.slice(0, 5).map((keyword) => `Secondary placement candidate: ${keywordText(keyword)}.`),
    faqCandidates: commercial.slice(0, 5).map((keyword) => keywordText(keyword)),
    imageAltDirection: imageAlt.slice(0, 5).map((keyword) => `Use only if visible in the exact image: ${keywordText(keyword)}.`),
    internalLinkingHints: collection.slice(0, 5).map((keyword) => `Future collection/internal-link intent: ${keywordText(keyword)}.`),
    blockedWords,
  };
}

export function buildSeoCatalogBrief(
  product: StorefrontProduct,
  selectedKeywords: SeoPilotKeyword[],
  manualFocus: SeoManualFocus = {},
): SeoPilotBrief {
  const decorated = assignCatalogRoles(selectedKeywords, manualFocus);
  const groups = roleGroups(decorated);
  const metrics = metricsStatus(decorated);
  const checks: SeoPilotBrief['blockerChecks'] = [
    { label: 'Product', status: productTitle(product) ? 'pass' : 'blocker', note: productTitle(product) ? 'Product identity loaded.' : 'Product title is missing.' },
    { label: 'Image', status: product.primary_image_url ? 'pass' : 'blocker', note: product.primary_image_url ? 'Primary image is available for vision.' : 'Primary image is missing.' },
    { label: 'Primary keyword', status: decorated.some((keyword) => keyword.pilot_role === 'primary') ? 'pass' : 'blocker', note: 'Primary must be an operator-selected product keyword re-confirmed by the approved Keyword Bank.' },
    { label: 'Metrics', status: metrics.validatedCount > 0 ? 'pass' : 'blocker', note: metrics.note },
  ];
  const status = checks.some((check) => check.status === 'blocker')
    ? 'blocked'
    : metrics.status === 'validated'
      ? 'ready_for_human_draft_preview'
      : 'needs_metric_validation';
  const preview = buildPreview(product, groups, manualFocus);
  const category = text(product.category_label || product.product_type, 'Product');
  const color = text(product.canonical_color_label || product.color, 'Needs review');
  const material = text(product.material, 'Needs review');
  const world = text(worldLabel(product), 'Needs review');

  return {
    status,
    productSlug: productSlug(product),
    productTitle: productTitle(product),
    productFacts: [
      { label: 'Категория', value: category },
      { label: 'Цвет', value: color },
      { label: 'Материал', value: material },
      { label: 'Мир / контекст', value: world },
      { label: 'Цена для предпросмотра', value: mainRegularPrice(product) ? `${mainRegularPrice(product)} ${product.currency || 'EUR'}` : 'нет подтверждённой цены' },
    ],
    manualFocus,
    metricsStatus: metrics,
    candidateKeywords: decorated.filter((keyword) => !['reject'].includes(keyword.pilot_role || '')),
    rejectedKeywords: decorated.filter((keyword) => keyword.pilot_role === 'reject'),
    keywordRoleGroups: groups,
    semanticBuckets: [],
    metricValidationPackage: [],
    scoringContract: scoringContract(),
    blockerChecks: checks,
    seoQaChecks: qaChecks(product, decorated, metrics),
    draftPreview: preview,
    decision: status === 'blocked'
      ? 'Catalog SEO draft is blocked until product identity, primary image, approved primary keyword and trusted metrics are present.'
      : 'Catalog SEO draft can proceed to deterministic generation and review. Final apply still requires Product Truth, portfolio, image and human gates.',
  };
}
