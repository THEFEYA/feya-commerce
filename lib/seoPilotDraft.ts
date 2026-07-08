import { mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export type SeoPilotKeywordRole = 'primary' | 'secondary' | 'support' | 'image_alt' | 'collection' | 'faq_commercial' | 'hold' | 'reject';

export type SeoPilotKeyword = {
  keyword?: string | null;
  keyword_norm?: string | null;
  priority_tier?: string | null;
  validation_status?: string | null;
  cleanup_pipeline_status?: string | null;
  should_validate_api?: boolean | null;
  should_hold?: boolean | null;
  warning_flags?: unknown;
  avg_monthly_searches?: number | string | null;
  competition?: string | null;
  competition_index?: number | string | null;
  score?: number | string | null;
  bank_bucket?: string | null;
  page_type?: string | null;
  source_row_type?: string | null;
  reason?: string | null;
  notes?: string | null;
  pilot_relevance_score?: number;
  pilot_relevance_reason?: string;
  pilot_strategy_bucket?: 'component_exact' | 'style_event' | 'material_color' | 'rejected_mismatch';
  pilot_role?: SeoPilotKeywordRole;
  pilot_role_reason?: string;
};

export type SeoManualFocus = {
  component?: unknown;
  material?: unknown;
  event?: unknown;
  style?: unknown;
  persona?: unknown;
  audience?: unknown;
  exclude?: unknown;
  [key: string]: unknown;
};

export type SeoSemanticSuggestion = {
  phrase: string;
  reason: string;
  source: 'product_fact' | 'strategy_seed' | 'queue_match';
  status: 'needs_metrics';
};

export type SeoSemanticBucket = {
  id: string;
  label: string;
  purpose: string;
  items: SeoSemanticSuggestion[];
};

export type SeoMetricValidationCandidate = {
  phrase: string;
  bucketId: string;
  bucketLabel: string;
  reason: string;
  source: SeoSemanticSuggestion['source'];
  status: 'needs_metrics';
  suggestedPlacement: string;
  metricSources: string[];
  language: 'en';
  targetRegions: string[];
};

export type SeoScoringFactor = {
  id: string;
  label: string;
  maxPoints: number;
  purpose: string;
  requiredInputs: string[];
};

export type SeoScoringDecisionRule = {
  role: 'primary' | 'secondary' | 'supporting' | 'long_tail' | 'image_alt' | 'faq' | 'collection' | 'hold' | 'reject';
  label: string;
  rule: string;
};

export type SeoScoringContract = {
  status: 'waiting_for_metrics';
  formula: string;
  totalMaxScore: number;
  factors: SeoScoringFactor[];
  decisionRules: SeoScoringDecisionRule[];
  requiredMetricFields: string[];
  hardGates: string[];
};

export type SeoMetricsStatus = {
  status: 'validated' | 'partial' | 'missing';
  totalKeywords: number;
  validatedCount: number;
  missingMetricCount: number;
  unknownCompetitionCount: number;
  note: string;
};

export type SeoKeywordRoleGroup = {
  role: SeoPilotKeywordRole;
  label: string;
  purpose: string;
  items: SeoPilotKeyword[];
};

export type SeoQaCheck = {
  id: string;
  label: string;
  status: 'pass' | 'warning' | 'blocker';
  note: string;
};

export type SeoPilotBrief = {
  status: 'blocked' | 'needs_metric_validation' | 'ready_for_human_draft_preview';
  productSlug: string;
  productTitle: string;
  productFacts: Array<{ label: string; value: string }>;
  manualFocus: SeoManualFocus;
  metricsStatus: SeoMetricsStatus;
  candidateKeywords: SeoPilotKeyword[];
  rejectedKeywords: SeoPilotKeyword[];
  keywordRoleGroups: SeoKeywordRoleGroup[];
  semanticBuckets: SeoSemanticBucket[];
  metricValidationPackage: SeoMetricValidationCandidate[];
  scoringContract: SeoScoringContract;
  blockerChecks: Array<{ label: string; status: 'pass' | 'warning' | 'blocker'; note: string }>;
  seoQaChecks: SeoQaCheck[];
  draftPreview: {
    seoTitle: string;
    h1: string;
    metaDescription: string;
    intro: string;
    bullets: string[];
    faqCandidates: string[];
    imageAltDirection: string[];
    internalLinkingHints: string[];
    blockedWords: string[];
  };
  decision: string;
};

type ProductKeywordProfile = {
  text: string;
  titleText: string;
  allowedComponents: string[];
  allowedStyleEventTerms: string[];
  allowedMaterialColorTerms: string[];
  manualTerms: string[];
  excludedTerms: string[];
  primaryTruth: string[];
  secondaryTruth: string[];
  imageTruth: string[];
  cyberpunkMain: boolean;
};

const COMPONENT_GROUPS: Record<string, string[]> = {
  armor: ['armor', 'armour', 'shoulder armor', 'shoulders', 'shoulder', 'bracer', 'bracers', 'arm bracer', 'arm bracers', 'arm cover', 'arm covers', 'arm guard', 'arm guards', 'collar', 'choker'],
  harness: ['harness', 'belt', 'garter', 'garters', 'body harness', 'chest harness'],
  corset: ['corset', 'top', 'bra', 'bodice', 'crop top'],
  skirt: ['skirt', 'mini skirt', 'open skirt'],
  bodysuit: ['bodysuit', 'body suit', 'leotard'],
  panties: ['panties', 'underwear', 'briefs'],
  gloves: ['gloves', 'glove'],
  headpiece: ['headpiece', 'head piece', 'horns', 'crown', 'halo', 'headdress'],
  mask: ['mask', 'face mask'],
  bracelet: ['bracelet', 'bracelets', 'armlet', 'armlets', 'cuff', 'cuffs'],
  body_spine_tail: ['spine', 'tail'],
};

const STYLE_EVENT_TERMS = ['festival', 'stage', 'performance', 'performer', 'dance', 'dancer', 'rave', 'edm', 'burning man', 'desert', 'futuristic', 'post apocalyptic', 'apocalyptic', 'steampunk', 'warrior', 'robot', 'cyber', 'cyberpunk', 'cosplay', 'costume', 'outfit', 'men', 'mens', "men's"];
const MATERIAL_COLOR_TERMS = ['gold', 'golden', 'silver', 'chrome', 'mirror', 'acrylic', 'leather', 'faux leather', 'vegan leather', 'black', 'white', 'red', 'holographic', 'silicone', 'metallic', 'reflective', 'glossy'];
const IMPLIED_ARMOR_SURFACE_TERMS = ['metallic', 'reflective', 'glossy', 'mirror'];
const COMMERCIAL_INTENT_PATTERN = /\b(buy|shop|shops|shopping|order|online|price|cost|shipping|delivery|custom|made to order|where to buy|for sale)\b/i;
const COLLECTION_PATTERN = /\b(festival outfit|festival outfits|festival costume|festival costumes|festival wear|festival clothing|rave outfit|rave outfits|rave wear|burning man outfit|burning man outfits|burning man costume|burning man festival|men'?s burning man clothes|men'?s edm festival clothing|gold festival outfit|festival outfits gold|cyberpunk festival outfit)\b/i;
const CLICHE_PATTERN = /\b(elevate your look|perfect for any occasion|crafted to perfection|turn heads|make a statement|must have)\b/i;
const GLOBAL_FORBIDDEN_PATTERN = /\b(lego|pokemon|pokémon|my little pony|saint patrick|st patrick|santa|gatsby|dinosaur|medical|safety harness|fall protection|diy|pattern|template)\b/i;
const PRODUCT_FORBIDDEN_PATTERN = /\b(women|woman|female|bodysuit|body suit|panties|underwear|garters|garter|choker|snake|neon|kids|child|children|wedding|bridal)\b/i;
const PRODUCT_SPECIFIC_EXCLUSIONS = ['women', 'bodysuit', 'panties', 'garters', 'choker', 'snake', 'neon', 'kids', 'wedding', 'bridal'];
const GLOBAL_BLOCKLIST_NOTE = ['lego', 'pokemon', 'my little pony', 'st patrick', 'santa', 'gatsby', 'dinosaur'];
const PRIMARY_TRUTH_ORDER = ['post apocalyptic shoulder armor', 'warrior shoulder armor', 'futuristic shoulder armor'];
const SECONDARY_TRUTH_ORDER = ['cyberpunk shoulder armor', 'gold shoulder armor', 'gold shoulders', 'warrior shoulders'];
const IMAGE_TRUTH_ORDER = ['gold shoulder armor', 'gold shoulders', 'warrior shoulders'];
const COLLECTION_TRUTH_ORDER = ['burning man festival costume', 'burning man festival outfits', "men's burning man clothes", "men's edm festival clothing", 'gold festival outfit', 'festival outfits gold', 'cyberpunk festival outfit'];

function clean(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function normalize(value: unknown) {
  return clean(value, '').trim().toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ');
}

function trimTo(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function hasTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
}

function toNumber(value: unknown) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function splitFocusValue(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(splitFocusValue);
  if (value == null) return [];
  return String(value)
    .split(/[|,;]+/)
    .map((item) => normalize(item))
    .filter(Boolean);
}

function uniqueStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalize(item);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function focusTerms(manualFocus?: SeoManualFocus) {
  const component = splitFocusValue(manualFocus?.component);
  const material = splitFocusValue(manualFocus?.material);
  const event = splitFocusValue(manualFocus?.event);
  const style = splitFocusValue(manualFocus?.style);
  const persona = splitFocusValue(manualFocus?.persona);
  const audience = splitFocusValue(manualFocus?.audience);
  const exclude = splitFocusValue(manualFocus?.exclude);
  return { component, material, event, style, persona, audience, exclude, all: [...component, ...material, ...event, ...style, ...persona, ...audience] };
}

function humanizeCategory(product: StorefrontProduct) {
  const title = productTitle(product);
  const raw = normalize(product.category_label || product.product_type);
  if (/armor/i.test(title)) return 'Armor set';
  if (/harness/i.test(title)) return 'Harness';
  if (/corset|top|bra/i.test(title)) return 'Top / corset';
  if (/mask/i.test(title)) return 'Mask / headpiece';
  if (/skirt/i.test(title)) return 'Skirt';
  if (raw === 'costume component or set') return 'Costume set';
  return raw || 'Statement outfit piece';
}

function humanizeColor(product: StorefrontProduct) {
  const title = productTitle(product);
  const raw = normalize(product.canonical_color_label || product.color);
  if (/gold|golden/i.test(title)) return 'Gold';
  if (/silver|chrome/i.test(title)) return 'Silver';
  if (/black/i.test(title)) return 'Black';
  if (/white/i.test(title)) return 'White';
  if (/holographic/i.test(title)) return 'Holographic';
  if (!raw || raw === 'signature') return 'Color visible in photos';
  return raw;
}

function humanizeWorld(product: StorefrontProduct, manualFocus: SeoManualFocus = {}) {
  const title = normalize(productTitle(product));
  const focus = focusTerms(manualFocus);
  const raw = clean(worldLabel(product), 'Stage look');
  if (hasTerm(`${title} ${focus.event.join(' ')}`, 'burning man')) return 'Burning Man';
  if (!raw || raw === 'Product') return 'Stage look';
  return raw.replace(/_/g, ' ');
}

function humanizeMaterial(product: StorefrontProduct) {
  return clean(product.material, 'Atelier materials').replace(/_/g, ' ');
}

function productProfile(product: StorefrontProduct, manualFocus: SeoManualFocus = {}): ProductKeywordProfile {
  const focus = focusTerms(manualFocus);
  const titleText = normalize(productTitle(product));
  const focusText = focus.all.join(' ');
  const text = normalize(`${titleText} ${humanizeCategory(product)} ${humanizeColor(product)} ${humanizeWorld(product, manualFocus)} ${humanizeMaterial(product)} ${product.material || ''} ${product.color || ''} ${focusText}`);
  const allowedComponents = new Set<string>();
  const allowedMaterialColorTerms = new Set<string>(MATERIAL_COLOR_TERMS.filter((term) => hasTerm(text, term)));
  const allowedStyleEventTerms = new Set<string>(STYLE_EVENT_TERMS.filter((term) => hasTerm(text, term) || ['festival', 'stage', 'performance', 'outfit', 'costume'].includes(term)));

  Object.values(COMPONENT_GROUPS).forEach((terms) => {
    if (terms.some((term) => hasTerm(text, term))) {
      terms.forEach((term) => allowedComponents.add(term));
    }
  });

  focus.component.forEach((term) => {
    allowedComponents.add(term);
    if (term === 'shoulders' || term === 'shoulder') {
      allowedComponents.add('shoulder armor');
      allowedComponents.add('shoulder');
      allowedComponents.add('shoulders');
      allowedComponents.add('armor');
    }
  });

  [...focus.event, ...focus.style, ...focus.persona, ...focus.audience].forEach((term) => {
    allowedStyleEventTerms.add(term);
    if (term === 'post apocalyptic') allowedStyleEventTerms.add('apocalyptic');
    if (term === 'cyberpunk') allowedStyleEventTerms.add('cyber');
    if (term === 'men') allowedStyleEventTerms.add("men's");
  });

  focus.material.forEach((term) => {
    allowedMaterialColorTerms.add(term);
    if (term === 'gold') allowedMaterialColorTerms.add('golden');
  });

  if (hasTerm(text, 'gold') || hasTerm(text, 'golden')) {
    allowedMaterialColorTerms.add('gold');
    allowedMaterialColorTerms.add('golden');
  }

  if ((hasTerm(text, 'gold') || hasTerm(text, 'silver') || hasTerm(text, 'armor')) && (hasTerm(text, 'armor') || hasTerm(text, 'shoulder') || hasTerm(text, 'choker') || hasTerm(text, 'bracer'))) {
    IMPLIED_ARMOR_SURFACE_TERMS.forEach((term) => allowedMaterialColorTerms.add(term));
  }

  const productTruthText = `${titleText} ${focusText}`;
  const hasShoulderArmor = hasTerm(text, 'shoulder') && hasTerm(text, 'armor');
  const primaryTruth = PRIMARY_TRUTH_ORDER.filter((phrase) => {
    if (!hasShoulderArmor) return false;
    if (phrase.startsWith('post apocalyptic')) return hasTerm(productTruthText, 'post apocalyptic') || hasTerm(productTruthText, 'apocalyptic');
    if (phrase.startsWith('warrior')) return hasTerm(productTruthText, 'warrior');
    if (phrase.startsWith('futuristic')) return hasTerm(productTruthText, 'futuristic');
    return false;
  });
  const secondaryTruth = SECONDARY_TRUTH_ORDER.filter((phrase) => {
    if (!hasShoulderArmor && phrase.includes('shoulder armor')) return false;
    if (phrase.includes('gold')) return hasTerm(text, 'gold');
    if (phrase.includes('warrior')) return hasTerm(productTruthText, 'warrior');
    if (phrase.includes('cyberpunk')) return hasTerm(productTruthText, 'cyberpunk');
    return true;
  });
  const imageTruth = IMAGE_TRUTH_ORDER.filter((phrase) => phrase.includes('gold') ? hasTerm(text, 'gold') : hasTerm(productTruthText, 'warrior'));
  const cyberpunkMain = hasTerm(titleText, 'cyberpunk') && !primaryTruth.some((phrase) => phrase.startsWith('post apocalyptic') || phrase.startsWith('warrior'));

  return {
    text,
    titleText,
    allowedComponents: Array.from(allowedComponents),
    allowedStyleEventTerms: Array.from(allowedStyleEventTerms),
    allowedMaterialColorTerms: Array.from(allowedMaterialColorTerms),
    manualTerms: focus.all,
    excludedTerms: focus.exclude,
    primaryTruth,
    secondaryTruth,
    imageTruth,
    cyberpunkMain,
  };
}

function keywordTerms(keywordText: string, terms: string[]) {
  return terms.filter((term) => hasTerm(keywordText, term));
}

function uniqueKeywords(keywords: SeoPilotKeyword[]) {
  const seen = new Set<string>();
  return keywords.filter((keyword) => {
    const key = normalize(keyword.keyword_norm || keyword.keyword);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function uniqueSuggestions(items: SeoSemanticSuggestion[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = normalize(item.phrase);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function seed(phrase: string, reason: string, source: SeoSemanticSuggestion['source'] = 'strategy_seed'): SeoSemanticSuggestion {
  return { phrase, reason, source, status: 'needs_metrics' };
}

function hasValidatedMetric(keyword: SeoPilotKeyword) {
  const volume = toNumber(keyword.avg_monthly_searches);
  const competition = normalize(keyword.competition);
  return volume != null && volume > 0 && Boolean(competition) && competition !== 'unknown';
}

function metricDemandScore(keyword: SeoPilotKeyword) {
  const volume = toNumber(keyword.avg_monthly_searches) || 0;
  if (volume >= 300) return 18;
  if (volume >= 100) return 14;
  if (volume >= 50) return 10;
  if (volume >= 20) return 7;
  if (volume >= 10) return 4;
  return 0;
}

function exactPhrasePriority(word: string, profile: ProductKeywordProfile) {
  const exactPrimaryIndex = profile.primaryTruth.findIndex((phrase) => normalize(phrase) === word);
  if (exactPrimaryIndex >= 0) return { score: 120 - exactPrimaryIndex * 8, reason: 'product truth priority: title/manual focus beats raw volume' };
  if (word === 'cyberpunk shoulder armor') return { score: profile.cyberpunkMain ? 70 : 22, reason: profile.cyberpunkMain ? 'cyberpunk is title-level product truth' : 'cyberpunk is adjacent style, kept secondary/support' };
  const exactSecondaryIndex = profile.secondaryTruth.findIndex((phrase) => normalize(phrase) === word);
  if (exactSecondaryIndex >= 0) return { score: 46 - exactSecondaryIndex * 4, reason: 'secondary product support / image truth' };
  const exactCollectionIndex = COLLECTION_TRUTH_ORDER.findIndex((phrase) => normalize(phrase) === word);
  if (exactCollectionIndex >= 0) return { score: 34 - exactCollectionIndex * 2, reason: 'collection/internal linking intent, not product primary' };
  return { score: 0, reason: '' };
}

function scoreKeyword(keyword: SeoPilotKeyword, profile: ProductKeywordProfile): SeoPilotKeyword {
  const word = normalize(keyword.keyword_norm || keyword.keyword);
  const componentTerms = keywordTerms(word, Object.values(COMPONENT_GROUPS).flat());
  const styleTerms = keywordTerms(word, STYLE_EVENT_TERMS);
  const materialTerms = keywordTerms(word, MATERIAL_COLOR_TERMS);
  const matchedComponents = componentTerms.filter((term) => profile.allowedComponents.includes(term));
  const mismatchedComponents = componentTerms.filter((term) => !matchedComponents.includes(term));
  const matchedStyle = styleTerms.filter((term) => profile.allowedStyleEventTerms.includes(term));
  const matchedMaterial = materialTerms.filter((term) => profile.allowedMaterialColorTerms.includes(term));
  const mismatchedMaterial = materialTerms.filter((term) => !matchedMaterial.includes(term));
  const exact = exactPhrasePriority(word, profile);

  if (GLOBAL_FORBIDDEN_PATTERN.test(word) || PRODUCT_FORBIDDEN_PATTERN.test(word)) {
    return { ...keyword, pilot_relevance_score: -120, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: 'отброшено: запрещённый, чужой или product-specific excluded intent' };
  }

  if (mismatchedComponents.length) {
    return { ...keyword, pilot_relevance_score: -100, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: `отброшено: в товаре нет детали ${mismatchedComponents[0]}` };
  }

  if (mismatchedMaterial.length) {
    return { ...keyword, pilot_relevance_score: -90, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: `отброшено: в товаре нет цвета/материала ${mismatchedMaterial[0]}` };
  }

  let score = exact.score;
  const reasons: string[] = exact.reason ? [exact.reason] : [];
  if (matchedComponents.length) {
    score += 70 + matchedComponents.length * 5;
    reasons.push(`деталь товара: ${matchedComponents.slice(0, 2).join(', ')}`);
  }
  if (matchedStyle.length) {
    const cyberpunkSoftener = word === 'cyberpunk shoulder armor' && !profile.cyberpunkMain ? -18 : 0;
    score += 25 + matchedStyle.length * 3 + cyberpunkSoftener;
    reasons.push(`стиль/событие: ${matchedStyle.slice(0, 2).join(', ')}`);
  }
  if (matchedMaterial.length) {
    score += matchedComponents.length || matchedStyle.length ? 12 : 3;
    reasons.push(`цвет/материал: ${matchedMaterial.slice(0, 2).join(', ')}`);
  }
  if (hasValidatedMetric(keyword)) {
    score += metricDemandScore(keyword);
    reasons.push(`метрика подтверждена: ${clean(keyword.avg_monthly_searches, '0')} / ${clean(keyword.competition, '—')}`);
  }

  if (!matchedComponents.length && !matchedStyle.length && !exact.score) {
    return { ...keyword, pilot_relevance_score: score, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: 'отброшено: есть только цвет/общее слово, нет детали или события' };
  }

  return { ...keyword, pilot_relevance_score: score, pilot_strategy_bucket: matchedComponents.length ? 'component_exact' : matchedStyle.length ? 'style_event' : 'material_color', pilot_relevance_reason: reasons.join(' · ') };
}

function scoreKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct, manualFocus: SeoManualFocus = {}) {
  const profile = productProfile(product, manualFocus);
  return uniqueKeywords(keywords)
    .filter((keyword) => keyword.should_hold !== true)
    .filter((keyword) => ['tier 1', 'tier1', 'tier_1', ''].includes(normalize(keyword.priority_tier)))
    .map((keyword) => scoreKeyword(keyword, profile))
    .sort((a, b) => (b.pilot_relevance_score || 0) - (a.pilot_relevance_score || 0));
}

function selectCandidateKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct, manualFocus: SeoManualFocus = {}) {
  return scoreKeywords(keywords, product, manualFocus)
    .filter((keyword) => (keyword.pilot_relevance_score || 0) >= 25 && keyword.pilot_strategy_bucket !== 'rejected_mismatch')
    .slice(0, 24);
}

function selectRejectedKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct, manualFocus: SeoManualFocus = {}) {
  return scoreKeywords(keywords, product, manualFocus)
    .filter((keyword) => keyword.pilot_strategy_bucket === 'rejected_mismatch')
    .slice(0, 8);
}

function roleForKeyword(keyword: SeoPilotKeyword, profile: ProductKeywordProfile): SeoPilotKeywordRole {
  const word = normalize(keyword.keyword_norm || keyword.keyword);
  const bucket = normalize(keyword.bank_bucket || keyword.page_type);
  const validated = hasValidatedMetric(keyword);

  if (keyword.pilot_strategy_bucket === 'rejected_mismatch') return 'reject';
  if (keyword.should_hold || normalize(keyword.source_row_type) === 'google ads related idea') return 'hold';
  if (!validated) return 'hold';
  if (COMMERCIAL_INTENT_PATTERN.test(word)) return 'faq_commercial';
  if (bucket.includes('collection') || COLLECTION_PATTERN.test(word)) return 'collection';
  if (profile.primaryTruth.some((phrase) => normalize(phrase) === word)) return 'primary';
  if (word === 'cyberpunk shoulder armor') return profile.cyberpunkMain ? 'primary' : 'secondary';
  if (word === 'gold shoulder armor') return 'secondary';
  if (profile.imageTruth.some((phrase) => normalize(phrase) === word)) return 'image_alt';
  if (profile.secondaryTruth.some((phrase) => normalize(phrase) === word)) return 'support';
  if (keyword.pilot_strategy_bucket === 'component_exact') return 'secondary';
  if (keyword.pilot_strategy_bucket === 'style_event') return 'support';
  return 'support';
}

function decorateKeywordRoles(keywords: SeoPilotKeyword[], product: StorefrontProduct, manualFocus: SeoManualFocus = {}) {
  const profile = productProfile(product, manualFocus);
  return keywords.map((keyword) => {
    const role = roleForKeyword(keyword, profile);
    const reason = role === 'primary'
      ? 'точный product truth keyword: title/manual focus выше raw score/volume'
      : role === 'secondary'
        ? 'сильный товарный ключ для H2/body/bullets; не вытесняет главный product truth'
        : role === 'image_alt'
          ? 'визуально подтверждаемая деталь для alt и описания фото'
          : role === 'collection'
            ? 'широкий event/style intent лучше вести в collection/internal links'
            : role === 'faq_commercial'
              ? 'commercial intent идёт в FAQ/meta/body, не в главный title'
              : role === 'hold'
                ? 'нет usable metric или нужен ручной review'
                : role === 'reject'
                  ? 'противоречит товару, global blacklist или product-specific exclusions'
                  : 'поддерживающий ключ для естественного текста';
    return { ...keyword, pilot_role: role, pilot_role_reason: reason };
  });
}

function buildKeywordRoleGroups(keywords: SeoPilotKeyword[]): SeoKeywordRoleGroup[] {
  const roleMeta: Array<{ role: SeoPilotKeywordRole; label: string; purpose: string }> = [
    { role: 'primary', label: 'Primary', purpose: 'Главные product truth ключи для title/H1/первого абзаца, только с подтверждёнными метриками.' },
    { role: 'secondary', label: 'Secondary', purpose: 'Сильная поддержка для H2/body/bullets без переспама.' },
    { role: 'support', label: 'Support', purpose: 'Естественные фразы для описания, FAQ и смыслового окружения.' },
    { role: 'image_alt', label: 'Image ALT', purpose: 'Только визуально подтверждённые детали: цвет, часть товара, силуэт.' },
    { role: 'collection', label: 'Collection / internal', purpose: 'Широкие event/style запросы для collection pages и перелинковки.' },
    { role: 'faq_commercial', label: 'FAQ / commercial', purpose: 'Buy/order/price/shipping intent: meta/body/FAQ, не главный title карточки.' },
    { role: 'hold', label: 'Hold / review', purpose: 'Релевантно, но нет метрик или нужен ручной выбор стратегии.' },
    { role: 'reject', label: 'Reject', purpose: 'Неверный компонент, цвет, событие или риск спама.' },
  ];

  return roleMeta
    .map((meta) => ({ ...meta, items: keywords.filter((keyword) => keyword.pilot_role === meta.role) }))
    .filter((group) => group.items.length);
}

function buildMetricsStatus(keywords: SeoPilotKeyword[]): SeoMetricsStatus {
  const totalKeywords = keywords.length;
  const validatedCount = keywords.filter(hasValidatedMetric).length;
  const unknownCompetitionCount = keywords.filter((keyword) => normalize(keyword.competition) === 'unknown').length;
  const missingMetricCount = totalKeywords - validatedCount;
  const status = validatedCount >= 3 ? 'validated' : validatedCount > 0 ? 'partial' : 'missing';
  const note = status === 'validated'
    ? `Есть ${validatedCount} ключей с Google/CSV метриками. Можно строить SEO preview, но финальный текст всё равно проходит QA.`
    : status === 'partial'
      ? `Есть только ${validatedCount} ключей с usable metrics. Primary лучше не утверждать без ручного review.`
      : 'Нет ключей с usable metrics. Нужен Google Ads / CSV / eRank/DataForSEO источник.';
  return { status, totalKeywords, validatedCount, missingMetricCount, unknownCompetitionCount, note };
}

function buildSemanticBuckets(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[], manualFocus: SeoManualFocus = {}): SeoSemanticBucket[] {
  const title = productTitle(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product, manualFocus);
  const material = humanizeMaterial(product);
  const focus = focusTerms(manualFocus);
  const lower = normalize(`${title} ${category} ${color} ${world} ${material} ${focus.all.join(' ')}`);
  const hasArmor = hasTerm(lower, 'armor');
  const hasShoulder = hasTerm(lower, 'shoulder') || hasTerm(lower, 'shoulders');
  const hasGold = hasTerm(lower, 'gold') || hasTerm(lower, 'golden');
  const hasFuturistic = hasTerm(lower, 'futuristic');
  const hasPostApocalyptic = hasTerm(lower, 'post apocalyptic') || hasTerm(lower, 'apocalyptic');
  const queueSeeds = candidateKeywords.slice(0, 4).map((keyword) => seed(clean(keyword.keyword || keyword.keyword_norm), 'уже найдено в текущей очереди ключей', 'queue_match'));

  const componentItems = uniqueSuggestions([
    hasArmor ? seed('armor set', 'главная товарная деталь из названия', 'product_fact') : null,
    hasShoulder ? seed('shoulder armor', 'точная часть товара', 'product_fact') : null,
    hasArmor && hasShoulder ? seed('shoulder armor set', 'комбинация главной детали и комплекта', 'strategy_seed') : null,
    ...queueSeeds,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const styleItems = uniqueSuggestions([
    hasPostApocalyptic && hasShoulder ? seed('post apocalyptic shoulder armor', 'manual focus + точная деталь товара', 'strategy_seed') : null,
    hasArmor ? seed('warrior shoulder armor', 'персонажная стратегия для armor + shoulders', 'strategy_seed') : null,
    hasFuturistic && hasShoulder ? seed('futuristic shoulder armor', 'стиль прямо указан в названии/фокусе', 'product_fact') : null,
    hasArmor ? seed('cyberpunk shoulder armor', 'secondary adjacent style, не главный angle если product truth сильнее', 'strategy_seed') : null,
    seed('stage outfit', 'сценический контекст товара', 'strategy_seed'),
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const eventItems = uniqueSuggestions([
    seed('burning man festival costume', 'event + product context для internal/collection', 'strategy_seed'),
    seed('burning man festival outfits', 'широкий collection intent', 'strategy_seed'),
    seed("men's burning man clothes", 'аудитория + событие, лучше для collection/internal', 'strategy_seed'),
    seed("men's EDM festival clothing", 'аудитория + rave/EDM intent, не product title', 'strategy_seed'),
    seed('desert festival outfit', 'ивент + визуальный мир', 'strategy_seed'),
  ]).slice(0, 12);

  const materialItems = uniqueSuggestions([
    hasGold && hasArmor ? seed('gold shoulder armor', 'цвет + точная часть товара', 'product_fact') : null,
    hasGold && hasShoulder ? seed('gold shoulders', 'видимая деталь для image ALT', 'product_fact') : null,
    hasArmor ? seed('warrior shoulders', 'видимая/персонажная деталь для image ALT/support', 'strategy_seed') : null,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const buckets: SeoSemanticBucket[] = [
    { id: 'components', label: 'Детали товара', purpose: 'То, что реально входит в товар. Самая безопасная база для title/H1/body.', items: componentItems },
    { id: 'style', label: 'Стиль', purpose: 'Product truth сначала: post-apocalyptic / warrior / futuristic. Cyberpunk — adjacent support.', items: styleItems },
    { id: 'event', label: 'Событие / collection', purpose: 'Burning Man, EDM, festival — чаще collection/internal, не primary title товара.', items: eventItems },
    { id: 'material_color', label: 'Материал / цвет / image truth', purpose: 'Gold shoulder armor / gold shoulders — товарная поддержка и ALT, если видно на фото.', items: materialItems },
  ];

  return buckets.filter((bucket) => bucket.items.length);
}

function placementForBucket(bucketId: string) {
  const placements: Record<string, string> = {
    components: 'товарная карточка: title / H1 / описание / alt',
    style: 'товарная карточка или коллекция: описание / H2 / FAQ',
    event: 'чаще коллекция или landing: collection / body / links',
    persona: 'вторичный угол: описание / FAQ / long-tail',
    material_color: 'товарная карточка и image SEO: title / body / alt',
    long_tail: 'точный long-tail: body / FAQ / meta / internal links',
  };
  return placements[bucketId] || 'после метрик решить placement';
}

function buildMetricValidationPackage(buckets: SeoSemanticBucket[]): SeoMetricValidationCandidate[] {
  return buckets.flatMap((bucket) => bucket.items.map((item) => ({
    phrase: item.phrase,
    bucketId: bucket.id,
    bucketLabel: bucket.label,
    reason: item.reason,
    source: item.source,
    status: 'needs_metrics' as const,
    suggestedPlacement: placementForBucket(bucket.id),
    metricSources: ['Google Ads', 'CSV/manual import', 'eRank/DataForSEO optional'],
    language: 'en' as const,
    targetRegions: ['US', 'UK', 'EU', 'CA', 'AU'],
  })));
}

function buildScoringContract(): SeoScoringContract {
  const factors: SeoScoringFactor[] = [
    { id: 'product_truth_fit', label: 'Правда товара', maxPoints: 30, purpose: 'Product title + facts + manual focus выше raw volume/simple score.', requiredInputs: ['product facts', 'manual focus', 'component/style/material match'] },
    { id: 'buyer_intent_fit', label: 'Намерение покупателя', maxPoints: 15, purpose: 'Понять, ищет ли человек товар, образ, событие, материал или просто вдохновение.', requiredInputs: ['bucket', 'keyword wording', 'commercial intent class'] },
    { id: 'search_demand', label: 'Спрос', maxPoints: 18, purpose: 'Оценить реальный search volume без выдуманных цифр.', requiredInputs: ['avg_monthly_searches', 'region', 'metric source', 'last_checked'] },
    { id: 'competition_opportunity', label: 'Шанс пройти конкуренцию', maxPoints: 12, purpose: 'Не выбирать автоматически самые жирные слова, если там слишком высокая конкуренция.', requiredInputs: ['competition', 'CPC/bid range', 'SERP or marketplace difficulty'] },
    { id: 'trend_event_fit', label: 'Тренд / сезонность / событие', maxPoints: 10, purpose: 'Учитывать фестивали, Burning Man, сезонные пики, performance season и текущий спрос.', requiredInputs: ['trend', 'seasonality', 'event calendar', 'region'] },
    { id: 'placement_fit', label: 'Место использования', maxPoints: 8, purpose: 'Решить, куда ключ подходит: title, H1, body, FAQ, alt, collection или internal links.', requiredInputs: ['suggested placement', 'page type', 'keyword length'] },
    { id: 'cannibal_safety', label: 'Безопасность от каннибализации', maxPoints: 10, purpose: 'Не заставлять похожие товары бороться за один и тот же primary keyword.', requiredInputs: ['similar products', 'existing keyword map', 'shared token similarity'] },
  ];

  return {
    status: 'waiting_for_metrics',
    formula: 'final_score = product_truth_fit + buyer_intent_fit + search_demand + competition_opportunity + trend_event_fit + placement_fit + cannibal_safety',
    totalMaxScore: factors.reduce((sum, factor) => sum + factor.maxPoints, 0),
    factors,
    requiredMetricFields: ['avg_monthly_searches', 'competition', 'low_bid/high_bid when currency-aware', 'trend', 'seasonality', 'region', 'metric_source', 'last_checked'],
    hardGates: [
      'Product title + product facts + manual focus outrank raw volume/simple score.',
      'Cyberpunk не становится primary, если post-apocalyptic / warrior / futuristic сильнее как product truth.',
      'Если ключ содержит деталь, которой нет в товаре — reject независимо от метрик.',
      'Если цвет/материал противоречит товару — reject независимо от метрик.',
      'Если нет подтверждённого metric_source — ключ не может стать финальным primary/secondary.',
      'Если высокий риск каннибализации — ключ нельзя ставить primary без ручного решения.',
      'Commercial intent вроде buy/order/price/shipping не ставится в главный title карточки без отдельного решения.',
    ],
    decisionRules: [
      { role: 'primary', label: 'Главный ключ', rule: 'Только точный product truth + подтверждённые метрики + низкий риск каннибализации.' },
      { role: 'secondary', label: 'Вторичные ключи', rule: 'Сильные товарные ключи для H2/body/bullets; могут иметь хороший score, но не вытесняют product truth.' },
      { role: 'supporting', label: 'Поддерживающие ключи', rule: 'Используются естественно в описании, FAQ или внутренних ссылках.' },
      { role: 'long_tail', label: 'Long-tail', rule: 'Точные длинные фразы с хорошей релевантностью; могут иметь меньший спрос, но выше conversion intent.' },
      { role: 'image_alt', label: 'Alt-тексты', rule: 'Только визуально подтверждённые детали: цвет, материал, компонент, силуэт, без невидимых claims.' },
      { role: 'faq', label: 'FAQ', rule: 'Вопросные/коммерческие интенты: sizing, styling, price, shipping, custom order, production only when supported.' },
      { role: 'collection', label: 'Коллекция / перелинковка', rule: 'Широкие слова вроде festival outfit или Burning Man clothes чаще ведут в collection, не в primary конкретного товара.' },
      { role: 'hold', label: 'На удержании', rule: 'Релевантно, но нет метрик, есть спорный placement или нужен ручной выбор стратегии.' },
      { role: 'reject', label: 'Исключить', rule: 'Неверный компонент, цвет, материал, событие или misleading buyer intent.' },
    ],
  };
}

function checkProduct(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[], metricsStatus: SeoMetricsStatus) {
  const checks: SeoPilotBrief['blockerChecks'] = [];
  const address = productSlug(product);
  const title = productTitle(product);

  checks.push({ label: 'Товарные факты', status: product.category_label || product.product_type ? 'pass' : 'blocker', note: product.category_label || product.product_type ? 'Категория товара найдена.' : 'Нет категории товара — нельзя безопасно писать SEO-текст.' });
  checks.push({ label: 'Изображение', status: product.primary_image_url ? 'pass' : 'blocker', note: product.primary_image_url ? 'Есть основное изображение.' : 'Нет основного изображения.' });
  checks.push({ label: 'Адрес товара', status: address && address !== String(product.canonical_product_id || '') ? 'pass' : 'warning', note: address && address !== String(product.canonical_product_id || '') ? 'Адрес товара выглядит пригодным.' : 'Адрес товара слабый или похож на ID.' });
  checks.push({ label: 'Цена', status: mainRegularPrice(product) ? 'pass' : 'warning', note: mainRegularPrice(product) ? 'Есть цена для предпросмотра.' : 'Цена не подтверждена для предпросмотра.' });
  checks.push({ label: 'Ключи', status: candidateKeywords.length >= 3 ? 'pass' : 'blocker', note: candidateKeywords.length >= 3 ? 'Есть релевантные ключи первой волны.' : 'Недостаточно релевантных ключей первой волны для пилота.' });
  checks.push({ label: 'Метрики', status: metricsStatus.status === 'validated' ? 'pass' : metricsStatus.status === 'partial' ? 'warning' : 'blocker', note: metricsStatus.note });

  if (!title || title.length < 20) {
    checks.push({ label: 'Title/H1', status: 'blocker', note: 'Слишком слабый title/H1.' });
  }

  return checks;
}

function resolveStatus(checks: SeoPilotBrief['blockerChecks']) {
  if (checks.some((check) => check.status === 'blocker')) return 'blocked' as const;
  if (checks.some((check) => check.status === 'warning')) return 'needs_metric_validation' as const;
  return 'ready_for_human_draft_preview' as const;
}

function buildQaChecks(product: StorefrontProduct, roleKeywords: SeoPilotKeyword[], draftText: string, metricsStatus: SeoMetricsStatus): SeoQaCheck[] {
  const joinedKeywords = roleKeywords.map((keyword) => normalize(keyword.keyword_norm || keyword.keyword)).join(' | ');
  const title = productTitle(product);
  return [
    { id: 'cliche_phrase', label: 'AI-клише / вода', status: CLICHE_PATTERN.test(draftText) ? 'warning' : 'pass', note: CLICHE_PATTERN.test(draftText) ? 'Есть риск шаблонной AI-фразы.' : 'Черновик избегает базовых клише.' },
    { id: 'long_dash', label: 'Длинные тире / AI-пунктуация', status: /—|–/.test(draftText) ? 'warning' : 'pass', note: /—|–/.test(draftText) ? 'В исходном title/preview есть длинные тире; финальный humanizer должен заменить лишние.' : 'Нет явного AI-style dash pattern.' },
    { id: 'keyword_stuffing', label: 'Keyword stuffing', status: joinedKeywords.split('shoulder armor').length > 5 ? 'warning' : 'pass', note: 'Primary keywords должны появляться естественно, без списка синонимов в одном абзаце.' },
    { id: 'product_specificity', label: 'Конкретика товара', status: /armor|shoulder|gold|burning man|warrior|futuristic/i.test(`${title} ${joinedKeywords}`) ? 'pass' : 'warning', note: 'Черновик должен отвечать: что это, из чего, для какого образа и где используется.' },
    { id: 'forbidden_mismatch', label: 'Запрещённые / чужие интенты', status: GLOBAL_FORBIDDEN_PATTERN.test(joinedKeywords) || PRODUCT_FORBIDDEN_PATTERN.test(joinedKeywords) ? 'blocker' : 'pass', note: GLOBAL_FORBIDDEN_PATTERN.test(joinedKeywords) || PRODUCT_FORBIDDEN_PATTERN.test(joinedKeywords) ? 'Есть чужой intent в выбранных ключах.' : `Product-specific exclusions отдельно; global blacklist скрыт из preview: ${GLOBAL_BLOCKLIST_NOTE.join(', ')}.` },
    { id: 'similarity_cannibalization', label: 'Similarity / cannibalization', status: 'warning', note: 'Final SEO pack requires similarity/cannibalization check before publish: проверить похожие FEYA товары и primary keyword map.' },
    { id: 'image_alt_truth', label: 'Image ALT truth', status: product.primary_image_url ? 'pass' : 'blocker', note: product.primary_image_url ? 'ALT можно строить только из видимых деталей: gold shoulder armor, gold shoulders, warrior shoulders, model/product context.' : 'Нет изображения для ALT QA.' },
    { id: 'commercial_placement', label: 'Commercial intent placement', status: 'pass', note: 'Buy/order/price/shipping/custom/delivery должны идти в meta/body/FAQ/landing, не в основной title этой карточки.' },
    { id: 'validated_metrics', label: 'Validated metrics', status: metricsStatus.status === 'validated' ? 'pass' : 'warning', note: metricsStatus.note },
  ];
}

function textOfKeyword(keyword?: SeoPilotKeyword) {
  return clean(keyword?.keyword || keyword?.keyword_norm, '');
}

function firstByRole(groups: SeoKeywordRoleGroup[], role: SeoPilotKeywordRole) {
  return groups.find((group) => group.role === role)?.items || [];
}

function titleCaseKeyword(value: string) {
  return value
    .split(' ')
    .map((part) => part.toLowerCase() === 'for' ? 'for' : part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
    .replace(/\bEdm\b/g, 'EDM');
}

function chooseByTruthOrder(keywords: SeoPilotKeyword[], order: string[]) {
  const normalized = keywords.map((keyword) => ({ keyword, word: normalize(keyword.keyword_norm || keyword.keyword) }));
  for (const phrase of order) {
    const match = normalized.find((item) => item.word === normalize(phrase));
    if (match) return match.keyword;
  }
  return keywords[0];
}

function buildDraftPreview(product: StorefrontProduct, groups: SeoKeywordRoleGroup[], metricsStatus: SeoMetricsStatus, manualFocus: SeoManualFocus) {
  const title = productTitle(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product, manualFocus);
  const material = humanizeMaterial(product);
  const primary = firstByRole(groups, 'primary');
  const secondary = [...firstByRole(groups, 'secondary'), ...firstByRole(groups, 'support')];
  const imageAlt = [...firstByRole(groups, 'image_alt'), ...firstByRole(groups, 'secondary')];
  const collection = firstByRole(groups, 'collection');
  const bestPrimary = chooseByTruthOrder(primary, PRIMARY_TRUTH_ORDER);
  const primaryKeyword = textOfKeyword(bestPrimary) || textOfKeyword(secondary[0]) || 'post apocalyptic shoulder armor';
  const secondaryKeyword = textOfKeyword(chooseByTruthOrder(secondary, SECONDARY_TRUTH_ORDER)) || world;
  const focus = focusTerms(manualFocus);
  const styleLine = uniqueStrings([...focus.style, ...focus.persona].filter((term) => term !== 'cyberpunk')).join(', ') || 'post-apocalyptic warrior styling';
  const intro = `${title} is a handmade ${color.toLowerCase()} ${category.toLowerCase()} for ${world}, built around ${primaryKeyword || 'a statement armor look'} and styled for ${styleLine}. Cyberpunk stays as a secondary support angle, not the main product truth.`;
  const productExcludedWords = uniqueStrings([...PRODUCT_SPECIFIC_EXCLUSIONS, ...focus.exclude]);
  const bullets = [
    `Primary SEO angle: ${primary.map(textOfKeyword).filter(Boolean).slice(0, 3).join(' / ') || primaryKeyword}.`,
    `Support angle: ${secondary.map(textOfKeyword).filter(Boolean).slice(0, 4).join(' / ') || 'cyberpunk shoulder armor / gold shoulder armor / warrior shoulders'}.`,
    `Product fact base: ${category}, ${color}, ${material}.`,
    metricsStatus.status === 'validated' ? `${metricsStatus.validatedCount} selected keywords have usable search metrics.` : 'Some keyword metrics still need review before final publish.',
    'Final generation must stay human, specific, non-repetitive and free from keyword stuffing.',
  ];

  return {
    seoTitle: trimTo(`${titleCaseKeyword(primaryKeyword || title)} for ${world} | TheFEYA`, 68),
    h1: trimTo(title, 90),
    metaDescription: trimTo(`${title}. Handmade ${color.toLowerCase()} armor styling for ${world}; ${secondaryKeyword} details, festival performance looks and made-to-order studio finish.`, 155),
    intro: trimTo(intro, 320),
    bullets,
    faqCandidates: ['What is included in this costume piece?', 'Can this look be styled for Burning Man or rave festivals?', 'How long does production and shipping take?', 'Can sizing or small details be adjusted?'],
    imageAltDirection: (imageAlt.length ? imageAlt : [...primary, ...secondary]).slice(0, 5).map((keyword) => `Use only visible truth: ${textOfKeyword(keyword)} on the model/product photo.`),
    internalLinkingHints: collection.length ? collection.map((keyword) => `Link naturally to a collection/landing around ${textOfKeyword(keyword)}.`) : [`Link to related Burning Man armor, futuristic festival looks and men's costume collections.`],
    blockedWords: productExcludedWords,
  };
}

export function buildSeoPilotBrief(product: StorefrontProduct, keywords: SeoPilotKeyword[], manualFocus: SeoManualFocus = {}): SeoPilotBrief {
  const candidateKeywords = selectCandidateKeywords(keywords, product, manualFocus);
  const rejectedKeywords = selectRejectedKeywords(keywords, product, manualFocus);
  const roleReadyKeywords = decorateKeywordRoles(candidateKeywords, product, manualFocus);
  const keywordRoleGroups = buildKeywordRoleGroups(roleReadyKeywords);
  const semanticBuckets = buildSemanticBuckets(product, roleReadyKeywords, manualFocus);
  const metricValidationPackage = buildMetricValidationPackage(semanticBuckets);
  const scoringContract = buildScoringContract();
  const metricsStatus = buildMetricsStatus(keywords);
  const checks = checkProduct(product, roleReadyKeywords, metricsStatus);
  const status = resolveStatus(checks);
  const slug = productSlug(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product, manualFocus);
  const material = humanizeMaterial(product);
  const draftPreview = buildDraftPreview(product, keywordRoleGroups, metricsStatus, manualFocus);
  const seoQaChecks = buildQaChecks(product, roleReadyKeywords, `${draftPreview.seoTitle} ${draftPreview.h1} ${draftPreview.metaDescription} ${draftPreview.intro}`, metricsStatus);

  return {
    status,
    productSlug: slug,
    productTitle: productTitle(product),
    productFacts: [
      { label: 'Категория', value: category },
      { label: 'Цвет', value: color },
      { label: 'Материал', value: material },
      { label: 'Мир / контекст', value: world },
      { label: 'Цена для предпросмотра', value: mainRegularPrice(product) ? `${mainRegularPrice(product)} ${product.currency || 'EUR'}` : 'нет подтверждённой цены' },
    ],
    manualFocus,
    metricsStatus,
    candidateKeywords: roleReadyKeywords,
    rejectedKeywords,
    keywordRoleGroups,
    semanticBuckets,
    metricValidationPackage,
    scoringContract,
    blockerChecks: checks,
    seoQaChecks,
    draftPreview,
    decision: status === 'blocked'
      ? 'Не готово к SEO-черновику: сначала закрыть блокеры.'
      : metricsStatus.status === 'validated'
        ? 'Можно готовить SEO-pack draft для ручной проверки: есть сохранённый фокус, выбранные ключи и подтверждённые метрики. Перед publish обязателен similarity/cannibalization check.'
        : 'Можно готовить только ограниченный preview: часть метрик или QA ещё требует проверки.',
  };
}
