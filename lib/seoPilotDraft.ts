import { mainRegularPrice, productSlug, productTitle, worldLabel } from '@/lib/storefront';
import type { StorefrontProduct } from '@/lib/types';

export type SeoPilotKeyword = {
  keyword?: string | null;
  keyword_norm?: string | null;
  priority_tier?: string | null;
  queue_suggested_page_level?: string | null;
  queue_keyword_axis?: string | null;
  queue_keyword_pattern?: string | null;
  validation_status?: string | null;
  cleanup_pipeline_status?: string | null;
  should_validate_api?: boolean | null;
  should_hold?: boolean | null;
  warning_flags?: unknown;
  pilot_relevance_score?: number;
  pilot_relevance_reason?: string;
  pilot_strategy_bucket?: 'component_exact' | 'style_event' | 'material_color' | 'rejected_mismatch';
};

export type SeoPilotBrief = {
  status: 'blocked' | 'needs_metric_validation' | 'ready_for_human_draft_preview';
  productSlug: string;
  productTitle: string;
  productFacts: Array<{ label: string; value: string }>;
  candidateKeywords: SeoPilotKeyword[];
  rejectedKeywords: SeoPilotKeyword[];
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
  armor: ['armor', 'armour', 'shoulder armor', 'shoulders', 'pauldron', 'shoulder', 'bracer', 'bracers', 'arm bracer', 'arm bracers', 'arm cover', 'arm covers', 'arm guard', 'arm guards', 'gauntlet', 'gauntlets', 'collar', 'choker', 'mask', 'face mask'],
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
const IMPLIED_GOLD_ARMOR_SURFACE_TERMS = ['metallic', 'reflective', 'glossy', 'mirror'];

function clean(value: unknown, fallback = '—') {
  if (value == null || value === '') return fallback;
  return String(value);
}

function normalize(value: unknown) {
  return clean(value, '').trim().toLowerCase();
}

function trimTo(value: string, max: number) {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trim()}…`;
}

function hasTerm(text: string, term: string) {
  return new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(text);
}

function titleHas(product: StorefrontProduct, pattern: RegExp) {
  return pattern.test(productTitle(product));
}

function humanizeCategory(product: StorefrontProduct) {
  const raw = normalize(product.category_label || product.product_type);
  if (titleHas(product, /armor/i)) return 'Armor set';
  if (titleHas(product, /harness/i)) return 'Harness';
  if (titleHas(product, /corset|top|bra/i)) return 'Top / corset';
  if (titleHas(product, /mask/i)) return 'Mask / headpiece';
  if (titleHas(product, /skirt/i)) return 'Skirt';
  if (raw === 'costume_component_or_set') return 'Costume set';
  if (raw) return raw.replace(/_/g, ' ');
  return 'Statement outfit piece';
}

function humanizeColor(product: StorefrontProduct) {
  const raw = normalize(product.canonical_color_label || product.color);
  const title = productTitle(product);
  if (/gold|golden/i.test(title)) return 'Gold';
  if (/silver|chrome/i.test(title)) return 'Silver';
  if (/black/i.test(title)) return 'Black';
  if (/white/i.test(title)) return 'White';
  if (/holographic/i.test(title)) return 'Holographic';
  if (!raw || raw === 'signature') return 'Color visible in photos';
  return clean(product.canonical_color_label || product.color).replace(/_/g, ' ');
}

function humanizeWorld(product: StorefrontProduct) {
  const raw = clean(worldLabel(product), 'Stage look');
  if (!raw || raw === 'Product') return 'Stage look';
  return raw.replace(/_/g, ' ');
}

function humanizeMaterial(product: StorefrontProduct) {
  const raw = clean(product.material, 'Atelier materials');
  return raw.replace(/_/g, ' ');
}

function productProfile(product: StorefrontProduct): ProductKeywordProfile {
  const text = normalize(`${productTitle(product)} ${humanizeCategory(product)} ${humanizeColor(product)} ${humanizeWorld(product)} ${humanizeMaterial(product)} ${product.material || ''} ${product.color || ''}`);
  const allowedComponents = new Set<string>();
  const allowedMaterialColorTerms = new Set<string>(MATERIAL_COLOR_TERMS.filter((term) => hasTerm(text, term)));

  for (const terms of Object.values(COMPONENT_GROUPS)) {
    if (terms.some((term) => hasTerm(text, term))) {
      terms.forEach((term) => allowedComponents.add(term));
    }
  }

  if (hasTerm(text, 'gold') || hasTerm(text, 'golden')) {
    allowedMaterialColorTerms.add('gold');
    allowedMaterialColorTerms.add('golden');
  }

  if ((hasTerm(text, 'gold') || hasTerm(text, 'silver') || hasTerm(text, 'armor')) && (hasTerm(text, 'armor') || hasTerm(text, 'shoulder') || hasTerm(text, 'choker') || hasTerm(text, 'bracer'))) {
    IMPLIED_GOLD_ARMOR_SURFACE_TERMS.forEach((term) => allowedMaterialColorTerms.add(term));
  }

  const allowedStyleEventTerms = STYLE_EVENT_TERMS.filter((term) => hasTerm(text, term) || ['festival', 'stage', 'performance', 'outfit', 'costume'].includes(term));

  return {
    text,
    allowedComponents: Array.from(allowedComponents),
    allowedStyleEventTerms,
    allowedMaterialColorTerms: Array.from(allowedMaterialColorTerms),
  };
}

function keywordComponentTerms(keywordText: string) {
  return Object.values(COMPONENT_GROUPS).flat().filter((term) => hasTerm(keywordText, term));
}

function keywordStyleTerms(keywordText: string) {
  return STYLE_EVENT_TERMS.filter((term) => hasTerm(keywordText, term));
}

function keywordMaterialTerms(keywordText: string) {
  return MATERIAL_COLOR_TERMS.filter((term) => hasTerm(keywordText, term));
}

function uniqueKeywords(keywords: SeoPilotKeyword[]) {
  const seen = new Set<string>();
  const result: SeoPilotKeyword[] = [];
  for (const keyword of keywords) {
    const key = normalize(keyword.keyword_norm || keyword.keyword);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(keyword);
  }
  return result;
}

function scoreKeyword(keyword: SeoPilotKeyword, profile: ProductKeywordProfile): SeoPilotKeyword {
  const word = normalize(keyword.keyword_norm || keyword.keyword);
  const componentTerms = keywordComponentTerms(word);
  const styleTerms = keywordStyleTerms(word);
  const materialTerms = keywordMaterialTerms(word);
  const matchedComponents = componentTerms.filter((term) => profile.allowedComponents.some((allowed) => allowed === term));
  const mismatchedComponents = componentTerms.filter((term) => !matchedComponents.includes(term));
  const matchedStyle = styleTerms.filter((term) => profile.allowedStyleEventTerms.includes(term));
  const matchedMaterial = materialTerms.filter((term) => profile.allowedMaterialColorTerms.includes(term));
  const mismatchedMaterial = materialTerms.filter((term) => !matchedMaterial.includes(term));

  if (mismatchedComponents.length) {
    return {
      ...keyword,
      pilot_relevance_score: -100,
      pilot_strategy_bucket: 'rejected_mismatch',
      pilot_relevance_reason: `отброшено: в товаре нет детали ${mismatchedComponents[0]}`,
    };
  }

  if (mismatchedMaterial.length) {
    return {
      ...keyword,
      pilot_relevance_score: -90,
      pilot_strategy_bucket: 'rejected_mismatch',
      pilot_relevance_reason: `отброшено: в товаре нет цвета/материала ${mismatchedMaterial[0]}`,
    };
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
    return {
      ...keyword,
      pilot_relevance_score: score,
      pilot_strategy_bucket: 'rejected_mismatch',
      pilot_relevance_reason: 'отброшено: есть только цвет/общее слово, нет детали или события',
    };
  }

  return {
    ...keyword,
    pilot_relevance_score: score,
    pilot_strategy_bucket: matchedComponents.length ? 'component_exact' : matchedStyle.length ? 'style_event' : 'material_color',
    pilot_relevance_reason: reasons.join(' · '),
  };
}

function scoreKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct) {
  const profile = productProfile(product);
  return uniqueKeywords(keywords)
    .filter((keyword) => keyword.should_hold !== true)
    .filter((keyword) => normalize(keyword.priority_tier) === 'tier_1')
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

function checkProduct(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[]) {
  const checks: SeoPilotBrief['blockerChecks'] = [];
  const address = productSlug(product);
  const title = productTitle(product);

  checks.push({
    label: 'Товарные факты',
    status: product.category_label || product.product_type ? 'pass' : 'blocker',
    note: product.category_label || product.product_type ? 'Категория товара найдена.' : 'Нет категории товара — нельзя безопасно писать SEO-текст.',
  });

  checks.push({
    label: 'Изображение',
    status: product.primary_image_url ? 'pass' : 'blocker',
    note: product.primary_image_url ? 'Есть основное изображение.' : 'Нет основного изображения.',
  });

  checks.push({
    label: 'Адрес товара',
    status: address && address !== String(product.canonical_product_id || '') ? 'pass' : 'warning',
    note: address && address !== String(product.canonical_product_id || '') ? 'Адрес товара выглядит пригодным.' : 'Адрес товара слабый или похож на ID.',
  });

  checks.push({
    label: 'Цена',
    status: mainRegularPrice(product) ? 'pass' : 'warning',
    note: mainRegularPrice(product) ? 'Есть цена для предпросмотра.' : 'Цена не подтверждена для предпросмотра.',
  });

  checks.push({
    label: 'Ключи',
    status: candidateKeywords.length >= 3 ? 'warning' : 'blocker',
    note: candidateKeywords.length >= 3 ? 'Есть релевантные ключи первой волны, но метрики ещё не подтверждены.' : 'Недостаточно релевантных ключей первой волны для пилота.',
  });

  checks.push({
    label: 'Метрики',
    status: 'warning',
    note: 'Очередь ждёт внешние метрики: Google Ads / CSV / eRank / другой подтверждённый источник.',
  });

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
  const checks = checkProduct(product, candidateKeywords);
  const status = resolveStatus(checks);
  const title = productTitle(product);
  const slug = productSlug(product);
  const category = humanizeCategory(product);
  const color = humanizeColor(product);
  const world = humanizeWorld(product);
  const material = humanizeMaterial(product);
  const primaryKeyword = clean(candidateKeywords[0]?.keyword || candidateKeywords[0]?.keyword_norm, category);
  const secondaryKeyword = clean(candidateKeywords[1]?.keyword || candidateKeywords[1]?.keyword_norm, world);

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
