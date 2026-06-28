import { mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export type SeoPilotKeyword = {
  keyword?: string | null;
  keyword_norm?: string | null;
  priority_tier?: string | null;
  validation_status?: string | null;
  cleanup_pipeline_status?: string | null;
  should_validate_api?: boolean | null;
  should_hold?: boolean | null;
  warning_flags?: unknown;
  pilot_relevance_score?: number;
  pilot_relevance_reason?: string;
  pilot_strategy_bucket?: 'component_exact' | 'style_event' | 'material_color' | 'rejected_mismatch';
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

export type SeoPilotBrief = {
  status: 'blocked' | 'needs_metric_validation' | 'ready_for_human_draft_preview';
  productSlug: string;
  productTitle: string;
  productFacts: Array<{ label: string; value: string }>;
  candidateKeywords: SeoPilotKeyword[];
  rejectedKeywords: SeoPilotKeyword[];
  semanticBuckets: SeoSemanticBucket[];
  metricValidationPackage: SeoMetricValidationCandidate[];
  scoringContract: SeoScoringContract;
  blockerChecks: Array<{ label: string; status: 'pass' | 'warning' | 'blocker'; note: string }>;
  draftPreview: {
    seoTitle: string;
    h1: string;
    metaDescription: string;
    intro: string;
    bullets: string[];
  };
  decision: string;
};

type ProductKeywordProfile = {
  text: string;
  allowedComponents: string[];
  allowedStyleEventTerms: string[];
  allowedMaterialColorTerms: string[];
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

const STYLE_EVENT_TERMS = ['festival', 'stage', 'performance', 'performer', 'dance', 'dancer', 'rave', 'edm', 'burning man', 'desert', 'futuristic', 'warrior', 'robot', 'cyber', 'cosplay', 'costume', 'outfit'];
const MATERIAL_COLOR_TERMS = ['gold', 'golden', 'silver', 'chrome', 'mirror', 'acrylic', 'leather', 'faux leather', 'black', 'white', 'red', 'holographic', 'silicone', 'metallic', 'reflective', 'glossy'];
const IMPLIED_ARMOR_SURFACE_TERMS = ['metallic', 'reflective', 'glossy', 'mirror'];

function clean(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function normalize(value: unknown) {
  return clean(value, '').trim().toLowerCase().replace(/[_-]+/g, ' ');
}

function trimTo(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function hasTerm(text: string, term: string) {
  return normalize(text).includes(normalize(term));
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

function humanizeWorld(product: StorefrontProduct) {
  const raw = clean(worldLabel(product), 'Stage look');
  if (!raw || raw === 'Product') return 'Stage look';
  return raw.replace(/_/g, ' ');
}

function humanizeMaterial(product: StorefrontProduct) {
  return clean(product.material, 'Atelier materials').replace(/_/g, ' ');
}

function productProfile(product: StorefrontProduct): ProductKeywordProfile {
  const text = normalize(`${productTitle(product)} ${humanizeCategory(product)} ${humanizeColor(product)} ${humanizeWorld(product)} ${humanizeMaterial(product)} ${product.material || ''} ${product.color || ''}`);
  const allowedComponents = new Set<string>();
  const allowedMaterialColorTerms = new Set<string>(MATERIAL_COLOR_TERMS.filter((term) => hasTerm(text, term)));

  Object.values(COMPONENT_GROUPS).forEach((terms) => {
    if (terms.some((term) => hasTerm(text, term))) {
      terms.forEach((term) => allowedComponents.add(term));
    }
  });

  if (hasTerm(text, 'gold') || hasTerm(text, 'golden')) {
    allowedMaterialColorTerms.add('gold');
    allowedMaterialColorTerms.add('golden');
  }

  if ((hasTerm(text, 'gold') || hasTerm(text, 'silver') || hasTerm(text, 'armor')) && (hasTerm(text, 'armor') || hasTerm(text, 'shoulder') || hasTerm(text, 'choker') || hasTerm(text, 'bracer'))) {
    IMPLIED_ARMOR_SURFACE_TERMS.forEach((term) => allowedMaterialColorTerms.add(term));
  }

  return {
    text,
    allowedComponents: Array.from(allowedComponents),
    allowedStyleEventTerms: STYLE_EVENT_TERMS.filter((term) => hasTerm(text, term) || ['festival', 'stage', 'performance', 'outfit', 'costume'].includes(term)),
    allowedMaterialColorTerms: Array.from(allowedMaterialColorTerms),
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

  if (mismatchedComponents.length) {
    return { ...keyword, pilot_relevance_score: -100, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: `отброшено: в товаре нет детали ${mismatchedComponents[0]}` };
  }

  if (mismatchedMaterial.length) {
    return { ...keyword, pilot_relevance_score: -90, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: `отброшено: в товаре нет цвета/материала ${mismatchedMaterial[0]}` };
  }

  let score = 0;
  const reasons: string[] = [];
  if (matchedComponents.length) {
    score += 70 + matchedComponents.length * 5;
    reasons.push(`деталь товара: ${matchedComponents.slice(0, 2).join(', ')}`);
  }
  if (matchedStyle.length) {
    score += 25 + matchedStyle.length * 3;
    reasons.push(`стиль/событие: ${matchedStyle.slice(0, 2).join(', ')}`);
  }
  if (matchedMaterial.length) {
    score += matchedComponents.length || matchedStyle.length ? 12 : 3;
    reasons.push(`цвет/материал: ${matchedMaterial.slice(0, 2).join(', ')}`);
  }

  if (!matchedComponents.length && !matchedStyle.length) {
    return { ...keyword, pilot_relevance_score: score, pilot_strategy_bucket: 'rejected_mismatch', pilot_relevance_reason: 'отброшено: есть только цвет/общее слово, нет детали или события' };
  }

  return { ...keyword, pilot_relevance_score: score, pilot_strategy_bucket: matchedComponents.length ? 'component_exact' : matchedStyle.length ? 'style_event' : 'material_color', pilot_relevance_reason: reasons.join(' · ') };
}

function scoreKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct) {
  const profile = productProfile(product);
  return uniqueKeywords(keywords)
    .filter((keyword) => keyword.should_hold !== true)
    .filter((keyword) => normalize(keyword.priority_tier) === 'tier 1')
    .map((keyword) => scoreKeyword(keyword, profile))
    .sort((a, b) => (b.pilot_relevance_score || 0) - (a.pilot_relevance_score || 0));
}

function selectCandidateKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct) {
  return scoreKeywords(keywords, product)
    .filter((keyword) => (keyword.pilot_relevance_score || 0) >= 25 && keyword.pilot_strategy_bucket !== 'rejected_mismatch')
    .slice(0, 12);
}

function selectRejectedKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct) {
  return scoreKeywords(keywords, product)
    .filter((keyword) => keyword.pilot_strategy_bucket === 'rejected_mismatch')
    .slice(0, 8);
}

function buildSemanticBuckets(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[]): SeoSemanticBucket[] {
  const title = productTitle(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product);
  const material = humanizeMaterial(product);
  const lower = normalize(`${title} ${category} ${color} ${world} ${material}`);
  const hasArmor = hasTerm(lower, 'armor');
  const hasShoulder = hasTerm(lower, 'shoulder') || hasTerm(lower, 'shoulders');
  const hasChoker = hasTerm(lower, 'choker') || hasTerm(lower, 'collar');
  const hasBracers = hasTerm(lower, 'bracer') || hasTerm(lower, 'bracers');
  const hasGold = hasTerm(lower, 'gold') || hasTerm(lower, 'golden');
  const hasFuturistic = hasTerm(lower, 'futuristic');
  const queueSeeds = candidateKeywords.slice(0, 4).map((keyword) => seed(clean(keyword.keyword || keyword.keyword_norm), 'уже найдено в текущей очереди ключей', 'queue_match'));

  const componentItems = uniqueSuggestions([
    hasArmor ? seed('armor set', 'главная товарная деталь из названия', 'product_fact') : null,
    hasShoulder ? seed('shoulder armor', 'точная часть товара', 'product_fact') : null,
    hasBracers ? seed('arm bracers', 'точная часть товара', 'product_fact') : null,
    hasBracers ? seed('arm covers', 'синоним для bracers / arm pieces', 'strategy_seed') : null,
    hasChoker ? seed('choker collar', 'точная часть товара', 'product_fact') : null,
    hasArmor && hasShoulder ? seed('shoulder armor set', 'комбинация главной детали и комплекта', 'strategy_seed') : null,
    ...queueSeeds,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const styleItems = uniqueSuggestions([
    hasFuturistic ? seed('futuristic armor', 'стиль прямо указан в названии', 'product_fact') : null,
    hasFuturistic && hasArmor ? seed('cyber armor', 'близкий стиль для futuristic armor', 'strategy_seed') : null,
    hasArmor ? seed('warrior armor', 'персонажная стратегия для armor', 'strategy_seed') : null,
    hasArmor ? seed('robot armor', 'соседний визуальный мир для futuristic armor', 'strategy_seed') : null,
    seed('performance outfit', 'назначение прямо указано в названии', 'product_fact'),
    seed('stage outfit', 'сценический контекст товара', 'strategy_seed'),
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const eventItems = uniqueSuggestions([
    seed('stage performance outfit', 'событие / использование: выступление', 'strategy_seed'),
    seed('festival armor', 'festival/rave стратегия для похожих FEYA товаров', 'strategy_seed'),
    seed('rave armor', 'низко- и среднечастотная event-гипотеза', 'strategy_seed'),
    seed('burning man armor', 'ивент-гипотеза для пустынного/futuristic visual world', 'strategy_seed'),
    seed('desert festival outfit', 'ивент + визуальный мир', 'strategy_seed'),
  ]).slice(0, 12);

  const personaItems = uniqueSuggestions([
    hasArmor ? seed('futuristic warrior', 'персонажная стратегия для armor + futuristic', 'strategy_seed') : null,
    hasArmor ? seed('desert warrior outfit', 'персонаж + Burning Man/desert strategy', 'strategy_seed') : null,
    hasArmor ? seed('robot warrior costume', 'персонаж + futuristic armor', 'strategy_seed') : null,
    hasArmor ? seed('sci fi armor outfit', 'sci-fi стратегия без привязки к брендам/франшизам', 'strategy_seed') : null,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const materialItems = uniqueSuggestions([
    hasGold && hasArmor ? seed('gold armor', 'цвет + главная деталь товара', 'product_fact') : null,
    hasGold && hasArmor ? seed('metallic gold armor', 'surface/style термин для золотой брони', 'strategy_seed') : null,
    hasGold && hasArmor ? seed('reflective gold armor', 'surface/style термин для глянцевой/зеркальной поверхности', 'strategy_seed') : null,
    hasGold && hasArmor ? seed('glossy gold armor', 'surface/style термин для блеска', 'strategy_seed') : null,
    hasGold && hasChoker ? seed('gold choker collar', 'цвет + точная часть товара', 'product_fact') : null,
    hasGold && hasShoulder ? seed('gold shoulder armor', 'цвет + точная часть товара', 'product_fact') : null,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const longTailItems = uniqueSuggestions([
    hasGold && hasFuturistic && hasShoulder ? seed('gold futuristic shoulder armor', 'long-tail из цвета, стиля и детали', 'strategy_seed') : null,
    hasGold && hasChoker && hasBracers ? seed('gold choker collar and arm bracers', 'long-tail по фактическим компонентам', 'strategy_seed') : null,
    hasShoulder && hasBracers ? seed('shoulder armor and arm bracers outfit', 'long-tail по комплекту', 'strategy_seed') : null,
    hasFuturistic && hasArmor ? seed('futuristic performance armor outfit', 'long-tail: стиль + назначение + деталь', 'strategy_seed') : null,
    hasGold && hasArmor ? seed('gold armor set for stage performance', 'long-tail под коммерческое назначение', 'strategy_seed') : null,
    hasArmor ? seed('futuristic warrior armor costume', 'long-tail под persona strategy', 'strategy_seed') : null,
  ].filter(Boolean) as SeoSemanticSuggestion[]).slice(0, 12);

  const buckets: SeoSemanticBucket[] = [
    { id: 'components', label: 'Детали товара', purpose: 'То, что реально входит в товар. Самая безопасная база для title/H1/body.', items: componentItems },
    { id: 'style', label: 'Стиль', purpose: 'Визуальное направление: futuristic, cyber, warrior, stage.', items: styleItems },
    { id: 'event', label: 'Событие', purpose: 'Где покупатель будет это использовать: stage, festival, rave, Burning Man.', items: eventItems },
    { id: 'persona', label: 'Персонаж / образ', purpose: 'Образ покупателя или роли: warrior, robot, sci-fi.', items: personaItems },
    { id: 'material_color', label: 'Материал / цвет', purpose: 'Gold, metallic, reflective, glossy — только если не противоречит товару.', items: materialItems },
    { id: 'long_tail', label: 'Long-tail', purpose: 'Длинные точные фразы для низкой конкуренции и лучшей релевантности.', items: longTailItems },
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
    {
      id: 'product_truth_fit',
      label: 'Правда товара',
      maxPoints: 25,
      purpose: 'Ключ должен совпадать с реальными деталями, цветом, материалом и назначением товара.',
      requiredInputs: ['product facts', 'component match', 'color/material match'],
    },
    {
      id: 'buyer_intent_fit',
      label: 'Намерение покупателя',
      maxPoints: 15,
      purpose: 'Понять, ищет ли человек товар, образ, событие, материал или просто вдохновение.',
      requiredInputs: ['bucket', 'keyword wording', 'commercial intent class'],
    },
    {
      id: 'search_demand',
      label: 'Спрос',
      maxPoints: 20,
      purpose: 'Оценить реальный search volume без выдуманных цифр.',
      requiredInputs: ['avg_monthly_searches', 'region', 'metric source', 'last_checked'],
    },
    {
      id: 'competition_opportunity',
      label: 'Шанс пройти конкуренцию',
      maxPoints: 12,
      purpose: 'Не выбирать автоматически самые жирные слова, если там слишком высокая конкуренция.',
      requiredInputs: ['competition', 'CPC/bid range', 'SERP or marketplace difficulty'],
    },
    {
      id: 'trend_event_fit',
      label: 'Тренд / сезонность / событие',
      maxPoints: 10,
      purpose: 'Учитывать фестивали, Burning Man, сезонные пики, performance season и текущий спрос.',
      requiredInputs: ['trend', 'seasonality', 'event calendar', 'region'],
    },
    {
      id: 'placement_fit',
      label: 'Место использования',
      maxPoints: 8,
      purpose: 'Решить, куда ключ подходит: title, H1, body, FAQ, alt, collection или internal links.',
      requiredInputs: ['suggested placement', 'page type', 'keyword length'],
    },
    {
      id: 'cannibal_safety',
      label: 'Безопасность от каннибализации',
      maxPoints: 10,
      purpose: 'Не заставлять похожие товары бороться за один и тот же primary keyword.',
      requiredInputs: ['similar products', 'existing keyword map', 'shared token similarity'],
    },
  ];

  return {
    status: 'waiting_for_metrics',
    formula: 'final_score = product_truth_fit + buyer_intent_fit + search_demand + competition_opportunity + trend_event_fit + placement_fit + cannibal_safety',
    totalMaxScore: factors.reduce((sum, factor) => sum + factor.maxPoints, 0),
    factors,
    requiredMetricFields: ['avg_monthly_searches', 'competition', 'low_bid', 'high_bid', 'trend', 'seasonality', 'region', 'metric_source', 'last_checked'],
    hardGates: [
      'Если ключ содержит деталь, которой нет в товаре — reject независимо от метрик.',
      'Если цвет/материал противоречит товару — reject независимо от метрик.',
      'Если нет подтверждённого metric_source — ключ не может стать финальным primary/secondary.',
      'Если высокий риск каннибализации — ключ нельзя ставить primary без ручного решения.',
      'Если ключ слишком общий, он чаще идёт в collection/landing, а не в primary карточки товара.',
    ],
    decisionRules: [
      { role: 'primary', label: 'Главный ключ', rule: '85–100 баллов, подтверждённые метрики, точный product truth, коммерческое намерение, низкий риск каннибализации.' },
      { role: 'secondary', label: 'Вторичные ключи', rule: '70–84 балла, хорошо поддерживают primary, подходят для H2/body/bullets без спама.' },
      { role: 'supporting', label: 'Поддерживающие ключи', rule: '55–69 баллов, используются естественно в описании, FAQ или внутренних ссылках.' },
      { role: 'long_tail', label: 'Long-tail', rule: 'Точные длинные фразы с хорошей релевантностью; могут иметь меньший спрос, но выше conversion intent.' },
      { role: 'image_alt', label: 'Alt-тексты', rule: 'Только визуально подтверждённые детали: цвет, материал, компонент, силуэт, без невидимых claims.' },
      { role: 'faq', label: 'FAQ', rule: 'Вопросные/сомневающиеся интенты: sizing, styling, festival use, shipping/production only when supported.' },
      { role: 'collection', label: 'Коллекция / перелинковка', rule: 'Широкие слова вроде festival outfit или stage looks чаще ведут в collection, не в primary конкретного товара.' },
      { role: 'hold', label: 'На удержании', rule: 'Релевантно, но нет метрик, есть спорный placement или нужен ручной выбор стратегии.' },
      { role: 'reject', label: 'Исключить', rule: 'Неверный компонент, цвет, материал, событие или misleading buyer intent.' },
    ],
  };
}

function checkProduct(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[]) {
  const checks: SeoPilotBrief['blockerChecks'] = [];
  const address = productSlug(product);
  const title = productTitle(product);

  checks.push({ label: 'Товарные факты', status: product.category_label || product.product_type ? 'pass' : 'blocker', note: product.category_label || product.product_type ? 'Категория товара найдена.' : 'Нет категории товара — нельзя безопасно писать SEO-текст.' });
  checks.push({ label: 'Изображение', status: product.primary_image_url ? 'pass' : 'blocker', note: product.primary_image_url ? 'Есть основное изображение.' : 'Нет основного изображения.' });
  checks.push({ label: 'Адрес товара', status: address && address !== String(product.canonical_product_id || '') ? 'pass' : 'warning', note: address && address !== String(product.canonical_product_id || '') ? 'Адрес товара выглядит пригодным.' : 'Адрес товара слабый или похож на ID.' });
  checks.push({ label: 'Цена', status: mainRegularPrice(product) ? 'pass' : 'warning', note: mainRegularPrice(product) ? 'Есть цена для предпросмотра.' : 'Цена не подтверждена для предпросмотра.' });
  checks.push({ label: 'Ключи', status: candidateKeywords.length >= 3 ? 'warning' : 'blocker', note: candidateKeywords.length >= 3 ? 'Есть релевантные ключи первой волны, но метрики ещё не подтверждены.' : 'Недостаточно релевантных ключей первой волны для пилота.' });
  checks.push({ label: 'Метрики', status: 'warning', note: 'Очередь ждёт внешние метрики: Google Ads / CSV / eRank / другой подтверждённый источник.' });

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

export function buildSeoPilotBrief(product: StorefrontProduct, keywords: SeoPilotKeyword[]): SeoPilotBrief {
  const candidateKeywords = selectCandidateKeywords(keywords, product);
  const rejectedKeywords = selectRejectedKeywords(keywords, product);
  const semanticBuckets = buildSemanticBuckets(product, candidateKeywords);
  const metricValidationPackage = buildMetricValidationPackage(semanticBuckets);
  const scoringContract = buildScoringContract();
  const checks = checkProduct(product, candidateKeywords);
  const status = resolveStatus(checks);
  const title = productTitle(product);
  const slug = productSlug(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product);
  const material = humanizeMaterial(product);
  const primaryKeyword = clean(candidateKeywords[0]?.keyword || candidateKeywords[0]?.keyword_norm || semanticBuckets[0]?.items[0]?.phrase, category);
  const secondaryKeyword = clean(candidateKeywords[1]?.keyword || candidateKeywords[1]?.keyword_norm || semanticBuckets[1]?.items[0]?.phrase, world);

  return {
    status,
    productSlug: slug,
    productTitle: title,
    productFacts: [
      { label: 'Категория', value: category },
      { label: 'Цвет', value: color },
      { label: 'Материал', value: material },
      { label: 'Мир / контекст', value: world },
      { label: 'Цена для предпросмотра', value: mainRegularPrice(product) ? `${mainRegularPrice(product)} ${product.currency || 'EUR'}` : 'нет подтверждённой цены' },
    ],
    candidateKeywords,
    rejectedKeywords,
    semanticBuckets,
    metricValidationPackage,
    scoringContract,
    blockerChecks: checks,
    draftPreview: {
      seoTitle: trimTo(`${title} | ${primaryKeyword} by TheFEYA`, 68),
      h1: title,
      metaDescription: trimTo(`${title} — handmade ${category.toLowerCase()} in ${color.toLowerCase()} for ${world.toLowerCase()}, stage styling and festival looks.`, 155),
      intro: `Controlled SEO preview for ${title}. This draft uses confirmed product facts first, then checks whether ${primaryKeyword} and ${secondaryKeyword} can support the page after real metric validation.`,
      bullets: [
        `Product fact base: ${category}, ${color}, ${material}.`,
        `Visual context: ${world}.`,
        `Keyword candidates are not final until metric validation is attached.`,
        `No component, size, shipping or price claim should be published unless it exists in product facts.`,
      ],
    },
    decision: status === 'blocked'
      ? 'Не готово к SEO-черновику: сначала закрыть блокеры.'
      : 'Можно готовить черновик для ручной проверки, но публиковать ещё нельзя: нужны подтверждённые метрики и ручное утверждение.',
  };
}
