import { classifySeoProductPresentation, hasWholeProductEntity } from './seoProductPresentation.ts';

export type SeoKeywordRecommendationStrategy = 'balanced' | 'demand' | 'opportunity' | 'niche';

type KeywordRow = Record<string, unknown>;
type ProductRow = Record<string, unknown>;
type FocusRecord = Record<string, unknown>;
type ScoredKeywordRow = KeywordRow & {
  recommendation_status: 'eligible' | 'rejected';
  recommendation_reject_reason: string | null;
  recommendation_score: number;
  product_truth_fit_score: number;
  whole_product_intent: boolean;
  partial_component_scope: boolean;
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

// Known irrelevant entities observed in the imported keyword bank. These are
// rejected before volume/competition scoring, including when an operator has
// not manually typed minus-words in the current session.
const EXCLUDED_KEYWORD_TERMS = [
  'lego', 'pokemon', 'pok mon', 'gatsby', 'saint patrick', 'st patrick', 'santa',
  'my little pony', 'casual', 'dinosaur',
];

// Product-family words such as "harness" also occur in automotive, industrial,
// safety and aerial-rigging queries. These phrases are incompatible with
// apparel Product Truth even when their search volume is high.
const INCOMPATIBLE_COMMERCE_DOMAINS = [
  '2jz',
  'automotive harness',
  'blackbear performance',
  'climbing harness',
  'dog harness',
  'fall arrest',
  'fall protection',
  'fan harness',
  'flying harness',
  'horse harness',
  'nelson performance',
  'rope body harness',
  'rope harness',
  'safety harness',
  'tweak d performance',
  'tennis skirt',
  'wiring harness',
];

const COLOR_FAMILIES: Record<string, string[]> = {
  black: ['black'],
  blue: ['blue'],
  bronze: ['bronze'],
  copper: ['copper'],
  gold: ['gold', 'golden'],
  green: ['green'],
  holographic: ['holographic', 'hologram', 'iridescent'],
  pink: ['pink'],
  purple: ['purple', 'violet'],
  red: ['red'],
  'rose gold': ['rose gold', 'rose golden'],
  silver: ['silver', 'chrome'],
  white: ['white'],
};

// These are matching aliases for the existing Product DNA families, not product claims.
const COMPONENT_FAMILIES: Record<string, string[]> = {
  armor: ['armor', 'armour'],
  arms: ['arm cover', 'arm covers', 'arm guard', 'arm guards', 'arm cuff', 'arm cuffs', 'bracer', 'bracers'],
  bodysuit: ['bodysuit', 'body suit', 'leotard'],
  boots: ['boot', 'boots'],
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
  pants: ['pants', 'trousers', 'leggings'],
  shoulders: ['shoulder', 'shoulders', 'shoulder piece', 'shoulder pieces', 'shoulder armor', 'shoulder armour', 'pauldron', 'pauldrons'],
  shorts: ['shorts', 'hot pants'],
  skirt: ['skirt', 'skirts', 'open skirt', 'ring skirt'],
  spine: ['spine', 'spines'],
  tail: ['tail', 'tails'],
  top: ['top', 'tops', 'crop top', 'bra top'],
  wings: ['wing', 'wings'],
};

const MATERIAL_TERMS = [
  'acrylic', 'chrome', 'fabric', 'faux leather', 'latex', 'leather', 'metallic', 'mirror', 'plastic',
  'silicone', 'vegan leather', 'vinyl', 'chain',
];

// These details change what the buyer expects to receive. They are allowed
// only when current Product Truth or the operator-confirmed material axis names
// them explicitly; a matching color/component is not enough evidence.
const EXPLICIT_PRODUCT_DETAIL_TERMS = ['chain'];

// "Armor" can describe the complete visual product even when the sold
// configuration is expressed through concrete Product Truth components such
// as Shoulders, Harness Top and Skirt. It remains an identity descriptor, not
// proof that a separate Armor component is included.
const UMBRELLA_COMPONENT_FAMILIES = new Set(['armor']);

// A generic family match is not enough for anatomical compound queries.
// "Leg harness" must never match a chest/torso harness merely because both
// contain "harness".
const ANATOMICAL_COMPONENT_REQUIREMENTS = [
  { pattern: /\bleg harness(?:es)?\b/i, requiredAny: ['legs', 'garters'] },
  { pattern: /\barm harness(?:es)?\b/i, requiredAny: ['arms'] },
  { pattern: /\bshoulder harness(?:es)?\b/i, requiredAny: ['shoulders'] },
];

const SIZE_POSITIONING_TERMS = ['plus size', 'mid size', 'midsize'];

const AUDIENCE_FAMILIES: Record<string, string[]> = {
  // Deliberately omit bare "man": it is part of the event name Burning Man.
  men: ['men', 'mens', "men's", 'male', 'guys'],
  women: ['women', 'womens', "women's", 'female', 'woman', 'ladies'],
};

const EVENT_FAMILIES: Record<string, string[]> = {
  'burning man': ['burning man', 'burningman'],
  coachella: ['coachella'],
  cosplay: ['cosplay'],
  edc: ['edc', 'electric daisy carnival'],
  festival: ['festival', 'festivals'],
  halloween: ['halloween'],
  photoshoot: ['photoshoot', 'photo shoot'],
  pride: ['pride'],
  rave: ['rave', 'raves'],
  stage: ['stage', 'performance', 'performances'],
};

const STYLE_FAMILIES: Record<string, string[]> = {
  burlesque: ['burlesque'],
  cosmic: ['cosmic'],
  cyberpunk: ['cyberpunk'],
  desert: ['desert', 'dune'],
  fantasy: ['fantasy'],
  futuristic: ['futuristic'],
  glam: ['glam'],
  goth: ['goth', 'gothic'],
  historical: ['historical', 'medieval', 'renaissance', 'roman', 'greek', 'egyptian'],
  'post apocalyptic': ['post apocalyptic', 'apocalyptic', 'wasteland'],
  punk: ['punk'],
  'sci fi': ['sci fi', 'science fiction'],
  steampunk: ['steampunk'],
};

const PERSONA_FAMILIES: Record<string, string[]> = {
  alien: ['alien'],
  angel: ['angel'],
  bunny: ['bunny', 'rabbit'],
  cat: ['cat', 'kitty'],
  cleopatra: ['cleopatra'],
  couple: ['couple', 'couples'],
  dancer: ['dancer'],
  demon: ['demon', 'devil'],
  dj: ['dj'],
  'drag queen': ['drag queen'],
  goddess: ['goddess'],
  'go go dancer': ['go go dancer', 'gogo dancer'],
  maleficent: ['maleficent'],
  'pole dancer': ['pole dancer'],
  queen: ['queen'],
  robot: ['robot'],
  showgirl: ['showgirl', 'show girl'],
  warrior: ['warrior'],
};

const VISUAL_ATTRIBUTE_FAMILIES: Record<string, string[]> = {
  glossy: ['glossy', 'gloss'],
  holographic: ['holographic', 'hologram', 'iridescent'],
  metallic: ['metallic'],
  mirror: ['mirror', 'mirrored'],
  reflective: ['reflective', 'light reflective'],
  sparkly: ['sparkly', 'glitter', 'glittery', 'sequin', 'sequins', 'rhinestone', 'rhinestones', 'crystal', 'crystals'],
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
  const eligibleRows = uniqueRows(input.approvedKeywords)
    .filter(isTrustedApprovedRow)
    .map((row) => scoreRow(row, profile, strategy))
    .filter((row) => row.recommendation_status === 'eligible')
    .sort(compareRows);
  const scored = uniqueSemanticRows(eligibleRows);

  // Listing Master saves the displayed recommendation as one operator-reviewed
  // decision. Keep that default decision intentionally small enough for a
  // human to inspect and for the writer to use as semantic evidence rather
  // than as a stuffing checklist.
  const productRows = scored.filter((row) => PRODUCT_BUCKETS.has(normalize(row.bank_bucket || row.page_type))).slice(0, 10);
  const faqRows = scored.filter((row) => normalize(row.bank_bucket || row.page_type) === 'faq').slice(0, 3);
  const collectionRows = scored.filter((row) => ['collection', 'commercial collection'].includes(normalize(row.bank_bucket || row.page_type))).slice(0, 3);
  const imageRows = scored.filter((row) => normalize(row.bank_bucket || row.page_type) === 'visual collection').slice(0, 2);
  const selected: RecommendedKeywordRow[] = uniqueRows([...productRows, ...faqRows, ...collectionRows, ...imageRows])
    .slice(0, Math.max(3, input.limit || 18))
    .map((row) => ({
      ...row,
      role: recommendedRole(row, productRows, profile.presentation.requires_whole_product_entity),
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
      eligible_rows_before_semantic_dedupe: eligibleRows.length,
      semantic_duplicates_removed: eligibleRows.length - scored.length,
      trusted_rows_scored: scored.length,
      recommended_rows: selected.length,
      recommended_product_rows: selected.filter((row) => PRODUCT_BUCKETS.has(normalize(row.bank_bucket || row.page_type))).length,
      recommended_faq_rows: selected.filter((row) => normalize(row.bank_bucket || row.page_type) === 'faq').length,
      recommended_collection_rows: selected.filter((row) => ['collection', 'commercial collection'].includes(normalize(row.bank_bucket || row.page_type))).length,
      product_component_families: profile.componentFamilies,
      product_identity_descriptor_families: profile.descriptorFamilies,
      product_presentation_mode: profile.presentation.mode,
      confirmed_component_count: profile.presentation.component_count,
      keyword_selection_status: selected.some((row) => row.role === 'primary')
        ? 'needs_human_confirmation'
        : 'needs_primary_review',
      auto_primary_scope: selected.find((row) => row.role === 'primary')?.whole_product_intent === true
        || !profile.presentation.requires_whole_product_entity
        ? 'whole_product_or_single_component'
        : 'blocked_no_whole_product_candidate',
      product_colors: profile.colors,
      product_audiences: profile.audiences,
      product_events: profile.events,
      product_styles: profile.styles,
      product_personas: profile.personas,
      product_visual_attributes: profile.visualAttributes,
      excluded_keyword_terms: profile.excludedTerms,
      truth_gate: 'explicit/global exclusions and component/color/audience/event/style/persona/visual mismatch reject before volume, competition or bank score is considered',
      confirmation_required: true,
      writes_performed: 0,
    },
  };
}

export function normalizeStrategy(value: unknown): SeoKeywordRecommendationStrategy {
  const strategy = normalize(typeof value === 'object' && value ? JSON.stringify(value) : value);
  const selectedModes = [
    /traffic|volume|demand|high volume/.test(strategy) ? 'demand' : null,
    /opportun|low competition|undervalued|under valued/.test(strategy) ? 'opportunity' : null,
    /niche|long tail|specific/.test(strategy) ? 'niche' : null,
  ].filter(Boolean);
  if (selectedModes.length > 1) return 'balanced';
  if (/traffic|volume|demand|high volume/.test(strategy)) return 'demand';
  if (/opportun|low competition|undervalued|under valued/.test(strategy)) return 'opportunity';
  if (/niche|long tail|specific/.test(strategy)) return 'niche';
  return 'balanced';
}

function buildProductProfile(product: ProductRow, focus: FocusRecord) {
  const explicitFocus = normalizeFocus(focus);
  const presentation = classifySeoProductPresentation(product);
  const currentSellableComponentEvidence = flattenStrings([
    product.sellable_offer_components,
    isRecord(product.sellable_offer) ? product.sellable_offer.component_labels : null,
  ]);
  const componentEvidence = (
    currentSellableComponentEvidence.length
      ? currentSellableComponentEvidence
      : flattenStrings([
          product.included_components,
          product.known_components,
          product.parent_components_json,
          product.child_components_json,
          product.component_groups_json,
        ])
  ).join(' ');
  const identityText = flattenStrings([
    product.product_type,
    product.category_label,
    product.operator_section_label,
    product.card_title,
    product.h1,
    product.focus_text,
  ]).join(' ');
  const styleText = flattenStrings([
    product.world_label,
    explicitFocus.event,
    explicitFocus.style,
    explicitFocus.persona,
    explicitFocus.audience,
    product.card_title,
    product.h1,
    product.focus_text,
    product.source_description_fragment,
  ]).join(' ');
  const materialText = flattenStrings([product.material, explicitFocus.material]).join(' ');
  const colorText = flattenStrings([product.canonical_color_label, product.color]).join(' ');
  const eventText = flattenStrings([
    explicitFocus.event,
    product.card_title,
    product.h1,
    product.focus_text,
    product.source_description_fragment,
  ]).join(' ');
  const personaText = flattenStrings([
    explicitFocus.persona,
    product.card_title,
    product.h1,
    product.focus_text,
    product.source_description_fragment,
  ]).join(' ');
  const visualText = flattenStrings([
    explicitFocus.material,
    product.material,
    product.card_title,
    product.h1,
    product.focus_text,
    product.source_description_fragment,
  ]).join(' ');
  // Product components are derived only from canonical Product Truth evidence.
  // A source title may describe styling or an umbrella identity, but it cannot
  // manufacture a sold component.
  const componentFamilies = detectedFamilies(componentEvidence, COMPONENT_FAMILIES);
  const descriptorFamilies = detectedFamilies(identityText, COMPONENT_FAMILIES)
    .filter((family) => UMBRELLA_COMPONENT_FAMILIES.has(family));
  const colors = detectedColorFamilies(colorText);
  const selectedAudiences = detectedFamilies(explicitFocus.audience, AUDIENCE_FAMILIES);
  const selectedEvents = detectedFamilies(explicitFocus.event, EVENT_FAMILIES);
  const selectedStyles = detectedFamilies(explicitFocus.style, STYLE_FAMILIES);
  const selectedPersonas = detectedFamilies(explicitFocus.persona, PERSONA_FAMILIES);
  // A non-empty operator axis is a boundary, not a scoring hint. Legacy
  // titles, source descriptions and images may suggest additional contexts,
  // but they cannot silently expand a saved manual focus.
  const audiences = explicitFocus.audience.length
    ? selectedAudiences
    : detectedFamilies(styleText, AUDIENCE_FAMILIES);
  const events = explicitFocus.event.length
    ? selectedEvents
    : detectedFamilies(eventText, EVENT_FAMILIES);
  const styles = explicitFocus.style.length
    ? selectedStyles
    : detectedFamilies(styleText, STYLE_FAMILIES);
  const personas = explicitFocus.persona.length
    ? selectedPersonas
    : detectedFamilies(personaText, PERSONA_FAMILIES);
  const visualAttributes = detectedFamilies(visualText, VISUAL_ATTRIBUTE_FAMILIES);
  const identityTokens = tokens(identityText).filter((token) => !STOP_WORDS.has(token) && token.length > 2);
  const styleTokens = tokens(styleText).filter((token) => !STOP_WORDS.has(token) && token.length > 2);
  const materialTerms = MATERIAL_TERMS.filter((term) => containsPhrase(materialText, term));
  const sizingEvidence = flattenStrings([
    product.confirmed_size_range,
    product.size_range,
    product.source_variations_json,
    product.source_variations,
    product.available_variants,
  ]).join(' ');
  const supportedSizePositioning = SIZE_POSITIONING_TERMS
    .filter((term) => containsPhrase(sizingEvidence, term));
  const focusPhrases = unique(Object.entries(explicitFocus)
    .filter(([key]) => key !== 'exclude')
    .flatMap(([, value]) => flattenStrings([value]))
    .map(normalize)
    .filter(Boolean));
  const excludedTerms = unique([
    ...EXCLUDED_KEYWORD_TERMS,
    ...flattenStrings([explicitFocus.exclude]).map(normalize).filter(Boolean),
  ]);

  return {
    presentation,
    componentFamilies,
    descriptorFamilies,
    colors,
    audiences,
    events,
    styles,
    personas,
    visualAttributes,
    identityTokens: unique(identityTokens),
    styleTokens: unique(styleTokens),
    materialTerms,
    supportedSizePositioning,
    focusPhrases,
    excludedTerms,
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
  const keywordColors = detectedColorFamilies(keyword);
  const keywordAudiences = detectedFamilies(keyword, AUDIENCE_FAMILIES);
  const keywordEvents = detectedFamilies(keyword, EVENT_FAMILIES);
  const keywordStyles = detectedFamilies(keyword, STYLE_FAMILIES);
  const keywordPersonas = detectedFamilies(keyword, PERSONA_FAMILIES);
  const keywordVisualAttributes = detectedFamilies(keyword, VISUAL_ATTRIBUTE_FAMILIES);
  const supportedComponentFamilies = unique([
    ...profile.componentFamilies,
    ...profile.descriptorFamilies,
  ]);
  const componentMatch = intersection(keywordComponents, supportedComponentFamilies);
  const narrowComponentMatch = intersection(
    keywordComponents.filter((family) => !UMBRELLA_COMPONENT_FAMILIES.has(family)),
    profile.componentFamilies,
  );
  const colorMatch = intersection(keywordColors, profile.colors);
  const audienceMatch = intersection(keywordAudiences, profile.audiences);
  const eventMatch = intersection(keywordEvents, profile.events);
  const styleMatch = intersection(keywordStyles, profile.styles);
  const personaMatch = intersection(keywordPersonas, profile.personas);
  const visualAttributeMatch = intersection(keywordVisualAttributes, profile.visualAttributes);
  const identityOverlap = intersection(tokens(keyword), profile.identityTokens);
  const styleOverlap = intersection(tokens(keyword), profile.styleTokens);
  const materialMatch = profile.materialTerms.filter((term) => containsPhrase(keyword, term));
  const unsupportedExplicitDetail = EXPLICIT_PRODUCT_DETAIL_TERMS.find((term) => (
    containsPhrase(keyword, term) && !profile.materialTerms.includes(term)
  ));
  const exactFocus = profile.focusPhrases.filter((term) => term.length > 2 && containsPhrase(keyword, term));
  const excludedMatch = profile.excludedTerms.find((term) => containsPhrase(keyword, term));
  const incompatibleDomain = INCOMPATIBLE_COMMERCE_DOMAINS.find((term) => containsPhrase(keyword, term));
  const anatomicalComponentMismatch = ANATOMICAL_COMPONENT_REQUIREMENTS.find((requirement) => (
    requirement.pattern.test(keyword)
    && !requirement.requiredAny.some((family) => profile.componentFamilies.includes(family))
  ));
  const unsupportedSizePositioning = SIZE_POSITIONING_TERMS.find((term) => (
    containsPhrase(keyword, term)
    && !profile.supportedSizePositioning.includes(term)
  ));

  const componentMismatch = keywordComponents.some((family) => !supportedComponentFamilies.includes(family));
  const colorMismatch = keywordColors.length > 0 && profile.colors.length > 0 && colorMatch.length === 0;
  const audienceMismatch = keywordAudiences.length > 0
    && profile.audiences.length === 1
    && audienceMatch.length === 0;
  const eventMismatch = keywordEvents.some((family) => !profile.events.includes(family));
  const styleMismatch = keywordStyles.some((family) => !profile.styles.includes(family));
  const personaMismatch = keywordPersonas.some((family) => !profile.personas.includes(family));
  const visualAttributeMismatch = keywordVisualAttributes
    .some((family) => !profile.visualAttributes.includes(family));
  const productBucket = PRODUCT_BUCKETS.has(bucket);
  const wholeProductIntent = productBucket
    && hasWholeProductEntity(keyword)
    && (
      !profile.presentation.requires_whole_product_entity
      || narrowComponentMatch.length === 0
      || narrowComponentMatch.length >= 2
    );
  const partialComponentScope = productBucket
    && profile.presentation.requires_whole_product_entity
    && narrowComponentMatch.length > 0
    && !wholeProductIntent;
  const supportedBucket = productBucket || SUPPORT_BUCKETS.has(bucket);
  const productIdentityGate = componentMatch.length > 0
    || identityOverlap.length >= (productBucket ? 2 : 1);
  const supportIntentGate = productIdentityGate || styleOverlap.length > 0;

  let rejectReason: string | null = null;
  if (incompatibleDomain) rejectReason = 'incompatible_commerce_domain';
  else if (excludedMatch) rejectReason = 'excluded_keyword_term';
  else if (!supportedBucket) rejectReason = 'unsupported_page_bucket';
  else if (anatomicalComponentMismatch) rejectReason = 'anatomical_component_mismatch';
  else if (unsupportedSizePositioning) rejectReason = 'unsupported_size_positioning';
  else if (unsupportedExplicitDetail) rejectReason = 'unsupported_product_detail';
  else if (componentMismatch) rejectReason = 'component_family_mismatch';
  else if (colorMismatch) rejectReason = 'color_mismatch';
  else if (audienceMismatch) rejectReason = 'audience_mismatch';
  else if (eventMismatch) rejectReason = 'event_mismatch';
  else if (styleMismatch) rejectReason = 'style_mismatch';
  else if (personaMismatch) rejectReason = 'persona_mismatch';
  else if (visualAttributeMismatch) rejectReason = 'visual_attribute_mismatch';
  else if (productBucket && !productIdentityGate) rejectReason = 'insufficient_product_truth_overlap';
  else if (!productBucket && !supportIntentGate) rejectReason = 'insufficient_focus_overlap';

  const productScopeScore = profile.presentation.requires_whole_product_entity
    ? wholeProductIntent ? 80 : partialComponentScope ? -35 : 0
    : 0;
  const truthScore = componentMatch.length * 46
    + exactFocus.length * 20
    + Math.min(identityOverlap.length, 5) * 7
    + Math.min(styleOverlap.length, 4) * 4
    + colorMatch.length * 10
    + materialMatch.length * 7
    + audienceMatch.length * 5
    + eventMatch.length * 6
    + styleMatch.length * 6
    + personaMatch.length * 6
    + visualAttributeMatch.length * 5
    + productScopeScore;
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
    whole_product_intent: wholeProductIntent,
    partial_component_scope: partialComponentScope,
    recommendation_reason: [
      wholeProductIntent ? 'scope:whole_product' : partialComponentScope ? 'scope:partial_component_only' : null,
      componentMatch.length ? `component:${componentMatch.join('|')}` : null,
      colorMatch.length ? `color:${colorMatch.join('|')}` : null,
      materialMatch.length ? `material:${materialMatch.join('|')}` : null,
      exactFocus.length ? `focus:${exactFocus.slice(0, 2).join('|')}` : null,
      eventMatch.length ? `event:${eventMatch.join('|')}` : null,
      styleMatch.length ? `style:${styleMatch.join('|')}` : null,
      personaMatch.length ? `persona:${personaMatch.join('|')}` : null,
      visualAttributeMatch.length ? `visual:${visualAttributeMatch.join('|')}` : null,
      identityOverlap.length ? `identity:${identityOverlap.slice(0, 4).join('|')}` : null,
      styleOverlap.length ? `context:${styleOverlap.slice(0, 3).join('|')}` : null,
      `strategy:${strategy}`,
    ].filter(Boolean).join(' · '),
  };
}

function recommendedRole(row: KeywordRow, productRows: KeywordRow[], requireWholeProduct: boolean) {
  const bucket = normalize(row.bank_bucket || row.page_type);
  if (bucket === 'faq') return 'supporting';
  if (['collection', 'commercial collection', 'visual collection'].includes(bucket)) return 'supporting';
  const primaryRow = requireWholeProduct
    ? productRows.find((candidate) => candidate.whole_product_intent === true)
    : productRows[0];
  if (PRODUCT_BUCKETS.has(bucket) && row === primaryRow) return 'primary';
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

function detectedColorFamilies(value: unknown) {
  const families = detectedFamilies(value, COLOR_FAMILIES);
  return families.includes('rose gold')
    ? families.filter((family) => family !== 'gold')
    : families;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
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

/**
 * Keeps one deterministic winner when the Keyword Bank contains the same
 * query as a word-order permutation, for example "leather harness top" and
 * "leather top harness". These rows represent one intent and must not consume
 * multiple keyword roles or create artificial density pressure.
 */
function uniqueSemanticRows<T extends KeywordRow>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const bucket = semanticBucket(row.bank_bucket || row.page_type);
    const signature = tokens(row.keyword_norm || row.keyword).sort().join(' ');
    const key = `${bucket}:${signature}`;
    if (!signature || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function semanticBucket(value: unknown) {
  const bucket = normalize(value);
  if (PRODUCT_BUCKETS.has(bucket)) return 'product';
  if (bucket === 'faq') return 'faq';
  if (['collection', 'commercial collection'].includes(bucket)) return 'collection';
  if (bucket === 'visual collection') return 'visual';
  return bucket;
}

function compareRows(a: KeywordRow, b: KeywordRow) {
  return Number(b.recommendation_score || 0) - Number(a.recommendation_score || 0)
    || Number(b.product_truth_fit_score || 0) - Number(a.product_truth_fit_score || 0)
    || Number(b.avg_monthly_searches || 0) - Number(a.avg_monthly_searches || 0)
    || String(a.keyword_norm || a.keyword || '').localeCompare(String(b.keyword_norm || b.keyword || ''));
}
