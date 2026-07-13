export type SeoKeywordRecommendationStrategy = 'balanced' | 'demand' | 'opportunity' | 'niche';

type KeywordRow = Record<string, unknown>;
type ProductRow = Record<string, unknown>;
type FocusRecord = Record<string, unknown>;
type ScoredKeywordRow = KeywordRow & {
  recommendation_status: 'eligible' | 'rejected';
  recommendation_reject_reason: string | null;
  recommendation_score: number;
  product_truth_fit_score: number;
  recommendation_reason: string;
};
type RecommendedKeywordRow = ScoredKeywordRow & {
  role: string;
  strategy_rank: number;
  match_score: number;
  auto_recommendation: true;
  auto_recommendation_needs_human_confirmation: true;
};

const PRODUCT_BUCKETS = new Set(['product', 'product or alt']);
const SUPPORT_BUCKETS = new Set(['faq', 'collection', 'commercial collection', 'visual collection']);
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'is', 'it', 'of', 'on', 'or',
  'our', 'the', 'this', 'to', 'with', 'wear', 'clothes', 'clothing', 'accessories', 'accessory',
  'costume', 'costumes', 'outfit', 'outfits', 'set', 'sets', 'fashion', 'unique',
]);

const COLOR_FAMILIES: Record<string, string[]> = {
  black: ['black'],
  blue: ['blue'],
  gold: ['gold', 'golden'],
  green: ['green'],
  holographic: ['holographic', 'hologram', 'iridescent'],
  pink: ['pink'],
  purple: ['purple', 'violet'],
  red: ['red'],
  silver: ['silver', 'chrome'],
  white: ['white'],
};

// These are matching aliases for the existing Product DNA families, not product claims.
const COMPONENT_FAMILIES: Record<string, string[]> = {
  armor: ['armor', 'armour'],
  arms: ['arm cover', 'arm covers', 'arm guard', 'arm guards', 'arm cuff', 'arm cuffs', 'bracer', 'bracers'],
  bodysuit: ['bodysuit', 'body suit', 'leotard'],
  bracelet: ['bracelet', 'bracelets', 'armlet', 'armlets'],
  choker: ['choker', 'collar', 'choke chain', 'choke chains'],
  corset: ['corset', 'bodice'],
  dress: ['dress', 'dresses'],
  garters: ['garter', 'garters', 'leg garter', 'leg garters'],
  harness: ['harness', 'body harness', 'chest harness'],
  headpiece: ['headpiece', 'head piece', 'headdress', 'crown', 'halo', 'horns'],
  helmet: ['helmet', 'helmets'],
  legs: ['leg cover', 'leg covers', 'leg armor', 'leg armour'],
  mask: ['mask', 'masks', 'face mask'],
  panties: ['panties', 'underwear', 'briefs'],
  shoulders: ['shoulder', 'shoulders', 'shoulder piece', 'shoulder pieces', 'shoulder armor', 'shoulder armour', 'pauldron', 'pauldrons'],
  skirt: ['skirt', 'skirts', 'open skirt', 'ring skirt'],
  spine: ['spine', 'spines'],
  tail: ['tail', 'tails'],
  top: ['top', 'tops', 'crop top', 'bra top'],
  wings: ['wing', 'wings'],
};

const MATERIAL_TERMS = [
  'acrylic', 'chrome', 'fabric', 'faux leather', 'latex', 'leather', 'metallic', 'mirror', 'plastic',
  'silicone', 'vegan leather', 'vinyl',
];

const AUDIENCE_FAMILIES: Record<string, string[]> = {
  men: ['men', 'mens', "men's", 'male', 'man', 'guys'],
  women: ['women', 'womens', "women's", 'female', 'woman', 'ladies'],
};

export function recommendCatalogKeywords(input: {
  product: ProductRow;
  approvedKeywords: KeywordRow[];
  focus?: FocusRecord | null;
  selectedStrategy?: unknown;
  limit?: number;
}) {
  const strategy = normalizeStrategy(input.selectedStrategy);
  const profile = buildProductProfile(input.product, input.focus || {});
  const scored = uniqueRows(input.approvedKeywords)
    .filter(isTrustedApprovedRow)
    .map((row) => scoreRow(row, profile, strategy))
    .filter((row) => row.recommendation_status === 'eligible')
    .sort(compareRows);

  const productRows = scored.filter((row) => PRODUCT_BUCKETS.has(normalize(row.bank_bucket || row.page_type))).slice(0, 18);
  const faqRows = scored.filter((row) => normalize(row.bank_bucket || row.page_type) === 'faq').slice(0, 6);
  const collectionRows = scored.filter((row) => ['collection', 'commercial collection'].includes(normalize(row.bank_bucket || row.page_type))).slice(0, 6);
  const imageRows = scored.filter((row) => normalize(row.bank_bucket || row.page_type) === 'visual collection').slice(0, 4);
  const selected: RecommendedKeywordRow[] = uniqueRows([...productRows, ...faqRows, ...collectionRows, ...imageRows])
    .slice(0, Math.max(3, input.limit || 30))
    .map((row, index) => ({
      ...row,
      role: recommendedRole(row, index, productRows),
      strategy_rank: row.recommendation_score,
      match_score: row.product_truth_fit_score,
      priority_tier: 'tier_1',
      validation_status: 'validated',
      cleanup_pipeline_status: 'approved_keyword_bank_auto_recommendation_v1',
      should_validate_api: false,
      should_hold: false,
      data_freshness_status: 'validated',
      auto_recommendation: true,
      auto_recommendation_needs_human_confirmation: true,
    }) as RecommendedKeywordRow);

  return {
    keywords: selected,
    focus: profile.focus,
    diagnostics: {
      mode: 'approved_keyword_bank_auto_recommendation_v1',
      strategy,
      approved_rows_received: input.approvedKeywords.length,
      trusted_rows_scored: scored.length,
      recommended_rows: selected.length,
      recommended_product_rows: selected.filter((row) => PRODUCT_BUCKETS.has(normalize(row.bank_bucket || row.page_type))).length,
      recommended_faq_rows: selected.filter((row) => normalize(row.bank_bucket || row.page_type) === 'faq').length,
      recommended_collection_rows: selected.filter((row) => ['collection', 'commercial collection'].includes(normalize(row.bank_bucket || row.page_type))).length,
      product_component_families: profile.componentFamilies,
      product_colors: profile.colors,
      product_audiences: profile.audiences,
      truth_gate: 'component/color/audience mismatch rejects before volume, competition or bank score is considered',
      confirmation_required: true,
      writes_performed: 0,
    },
  };
}

export function normalizeStrategy(value: unknown): SeoKeywordRecommendationStrategy {
  const strategy = normalize(typeof value === 'object' && value ? JSON.stringify(value) : value);
  if (/traffic|volume|demand|high volume/.test(strategy)) return 'demand';
  if (/opportun|low competition|undervalued|under valued/.test(strategy)) return 'opportunity';
  if (/niche|long tail|specific/.test(strategy)) return 'niche';
  return 'balanced';
}

function buildProductProfile(product: ProductRow, focus: FocusRecord) {
  const explicitFocus = normalizeFocus(focus);
  const componentEvidence = flattenStrings([
    product.parent_components_json,
    product.child_components_json,
    product.component_groups_json,
    explicitFocus.component,
  ]).join(' ');
  const identityText = flattenStrings([
    product.product_type,
    product.category_label,
    product.operator_section_label,
    product.card_title,
    product.h1,
    product.focus_text,
    explicitFocus.component,
  ]).join(' ');
  const styleText = flattenStrings([
    product.world_label,
    explicitFocus.event,
    explicitFocus.style,
    explicitFocus.persona,
    explicitFocus.audience,
    product.card_title,
  ]).join(' ');
  const materialText = flattenStrings([product.material, explicitFocus.material]).join(' ');
  const colorText = flattenStrings([product.canonical_color_label, product.color]).join(' ');
  const componentFamilies = detectedFamilies(`${componentEvidence} ${identityText}`, COMPONENT_FAMILIES);
  const colors = detectedFamilies(colorText, COLOR_FAMILIES);
  const audiences = detectedFamilies(`${styleText} ${flattenStrings([explicitFocus.audience]).join(' ')}`, AUDIENCE_FAMILIES);
  const identityTokens = tokens(identityText).filter((token) => !STOP_WORDS.has(token) && token.length > 2);
  const styleTokens = tokens(styleText).filter((token) => !STOP_WORDS.has(token) && token.length > 2);
  const materialTerms = MATERIAL_TERMS.filter((term) => containsPhrase(materialText, term));

  return {
    componentFamilies,
    colors,
    audiences,
    identityTokens: unique(identityTokens),
    styleTokens: unique(styleTokens),
    materialTerms,
    focusPhrases: unique(flattenStrings(Object.values(explicitFocus)).map(normalize).filter(Boolean)),
    focus: explicitFocus,
  };
}

function scoreRow(
  row: KeywordRow,
  profile: ReturnType<typeof buildProductProfile>,
  strategy: SeoKeywordRecommendationStrategy,
): ScoredKeywordRow {
  const keyword = normalize(row.keyword_norm || row.keyword);
  const bucket = normalize(row.bank_bucket || row.page_type);
  const keywordComponents = detectedFamilies(keyword, COMPONENT_FAMILIES);
  const keywordColors = detectedFamilies(keyword, COLOR_FAMILIES);
  const keywordAudiences = detectedFamilies(keyword, AUDIENCE_FAMILIES);
  const componentMatch = intersection(keywordComponents, profile.componentFamilies);
  const colorMatch = intersection(keywordColors, profile.colors);
  const audienceMatch = intersection(keywordAudiences, profile.audiences);
  const identityOverlap = intersection(tokens(keyword), profile.identityTokens);
  const styleOverlap = intersection(tokens(keyword), profile.styleTokens);
  const materialMatch = profile.materialTerms.filter((term) => containsPhrase(keyword, term));
  const exactFocus = profile.focusPhrases.filter((term) => term.length > 2 && containsPhrase(keyword, term));

  const componentMismatch = keywordComponents.length > 0 && componentMatch.length === 0;
  const colorMismatch = keywordColors.length > 0 && profile.colors.length > 0 && colorMatch.length === 0;
  const audienceMismatch = keywordAudiences.length > 0
    && profile.audiences.length === 1
    && audienceMatch.length === 0;
  const productBucket = PRODUCT_BUCKETS.has(bucket);
  const supportedBucket = productBucket || SUPPORT_BUCKETS.has(bucket);
  const productIdentityGate = componentMatch.length > 0
    || exactFocus.length > 0
    || identityOverlap.length >= (productBucket ? 2 : 1);
  const supportIntentGate = productIdentityGate || styleOverlap.length > 0;

  let rejectReason: string | null = null;
  if (!supportedBucket) rejectReason = 'unsupported_page_bucket';
  else if (componentMismatch) rejectReason = 'component_family_mismatch';
  else if (colorMismatch) rejectReason = 'color_mismatch';
  else if (audienceMismatch) rejectReason = 'audience_mismatch';
  else if (productBucket && !productIdentityGate) rejectReason = 'insufficient_product_truth_overlap';
  else if (!productBucket && !supportIntentGate) rejectReason = 'insufficient_focus_overlap';

  const truthScore = componentMatch.length * 46
    + exactFocus.length * 20
    + Math.min(identityOverlap.length, 5) * 7
    + Math.min(styleOverlap.length, 4) * 4
    + colorMatch.length * 10
    + materialMatch.length * 7
    + audienceMatch.length * 5;
  const volume = positiveNumber(row.avg_monthly_searches);
  const competitionIndex = boundedNumber(row.competition_index, 0, 100);
  const bankScore = boundedNumber(row.score, 0, 100);
  const demandScore = volume ? Math.min(24, Math.log10(volume + 1) * 6) : 0;
  const opportunityScore = competitionIndex == null ? 0 : (100 - competitionIndex) / 8;
  const nicheScore = Math.max(0, Math.min(12, tokens(keyword).length * 2 - 2));
  const strategyScore = strategy === 'demand'
    ? demandScore * 1.35
    : strategy === 'opportunity'
      ? demandScore * 0.7 + opportunityScore * 1.6
      : strategy === 'niche'
        ? demandScore * 0.55 + opportunityScore * 0.6 + nicheScore * 1.5
        : demandScore + opportunityScore * 0.75 + nicheScore * 0.35;
  const recommendationScore = truthScore * 4 + strategyScore + (bankScore || 0) * 0.12;

  return {
    ...row,
    keyword: row.keyword || row.keyword_norm,
    keyword_norm: row.keyword_norm || row.keyword,
    recommendation_status: rejectReason ? 'rejected' : 'eligible',
    recommendation_reject_reason: rejectReason,
    recommendation_score: Math.round(recommendationScore * 100) / 100,
    product_truth_fit_score: truthScore,
    recommendation_reason: [
      componentMatch.length ? `component:${componentMatch.join('|')}` : null,
      colorMatch.length ? `color:${colorMatch.join('|')}` : null,
      materialMatch.length ? `material:${materialMatch.join('|')}` : null,
      exactFocus.length ? `focus:${exactFocus.slice(0, 2).join('|')}` : null,
      identityOverlap.length ? `identity:${identityOverlap.slice(0, 4).join('|')}` : null,
      styleOverlap.length ? `context:${styleOverlap.slice(0, 3).join('|')}` : null,
      `strategy:${strategy}`,
    ].filter(Boolean).join(' · '),
  };
}

function recommendedRole(row: KeywordRow, index: number, productRows: KeywordRow[]) {
  const bucket = normalize(row.bank_bucket || row.page_type);
  if (bucket === 'faq') return 'supporting';
  if (['collection', 'commercial collection', 'visual collection'].includes(bucket)) return 'supporting';
  if (PRODUCT_BUCKETS.has(bucket) && row === productRows[0] && index === 0) return 'primary';
  return normalize(row.role) === 'supporting' ? 'supporting' : 'secondary';
}

function isTrustedApprovedRow(row: KeywordRow) {
  const bucket = normalize(row.bank_bucket || row.page_type);
  const review = normalize(row.review_status);
  const competition = normalize(row.competition);
  return (review === 'approved draft' || review === '')
    && (PRODUCT_BUCKETS.has(bucket) || SUPPORT_BUCKETS.has(bucket))
    && positiveNumber(row.avg_monthly_searches) != null
    && Boolean(competition)
    && competition !== 'unknown'
    && Boolean(normalize(row.metric_source))
    && Boolean(String(row.last_checked || '').trim());
}

function normalizeFocus(value: FocusRecord) {
  const keys = ['component', 'material', 'event', 'style', 'persona', 'audience', 'exclude'];
  return Object.fromEntries(keys.map((key) => [key, unique(flattenStrings([value?.[key]]).map(normalize).filter(Boolean))]));
}

function detectedFamilies(value: unknown, families: Record<string, string[]>) {
  const text = normalize(value);
  return Object.entries(families)
    .filter(([, aliases]) => aliases.some((alias) => containsPhrase(text, alias)))
    .map(([family]) => family);
}

function containsPhrase(value: unknown, phrase: unknown) {
  const haystack = ` ${normalize(value)} `;
  const needle = ` ${normalize(phrase)} `;
  return needle.trim().length > 0 && haystack.includes(needle);
}

function flattenStrings(values: unknown[], depth = 0): string[] {
  if (depth > 5) return [];
  return values.flatMap((value) => {
    if (value == null || typeof value === 'boolean') return [];
    if (typeof value === 'string' || typeof value === 'number') return [String(value)];
    if (Array.isArray(value)) return flattenStrings(value, depth + 1);
    if (typeof value === 'object') return flattenStrings(Object.values(value as Record<string, unknown>), depth + 1);
    return [];
  });
}

function tokens(value: unknown) {
  return normalize(value).split(' ').filter(Boolean);
}

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

function positiveNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function boundedNumber(value: unknown, min: number, max: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : null;
}

function intersection(left: string[], right: string[]) {
  const rightSet = new Set(right);
  return unique(left.filter((item) => rightSet.has(item)));
}

function unique<T>(items: T[]) {
  return [...new Set(items)];
}

function uniqueRows<T extends KeywordRow>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = normalize(row.keyword_norm || row.keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function compareRows(a: KeywordRow, b: KeywordRow) {
  return Number(b.recommendation_score || 0) - Number(a.recommendation_score || 0)
    || Number(b.product_truth_fit_score || 0) - Number(a.product_truth_fit_score || 0)
    || Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0)
    || String(a.keyword_norm || a.keyword || '').localeCompare(String(b.keyword_norm || b.keyword || ''));
}
