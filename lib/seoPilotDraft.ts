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
};

export type SeoPilotBrief = {
  status: 'blocked' | 'needs_metric_validation' | 'ready_for_human_draft_preview';
  productSlug: string;
  productTitle: string;
  productFacts: Array<{ label: string; value: string }>;
  candidateKeywords: SeoPilotKeyword[];
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

function selectCandidateKeywords(keywords: SeoPilotKeyword[], product: StorefrontProduct) {
  const title = normalize(productTitle(product));
  const category = normalize(product.category_label || product.product_type);
  const world = normalize(worldLabel(product));
  const material = normalize(product.material);
  const color = normalize(product.canonical_color_label || product.color);
  const text = `${title} ${category} ${world} ${material} ${color}`;

  const usable = keywords.filter((keyword) => {
    if (keyword.should_hold === true) return false;
    if (normalize(keyword.priority_tier) !== 'tier_1') return false;
    const word = normalize(keyword.keyword_norm || keyword.keyword);
    if (!word) return false;
    const tokens = word.split(/\s+/).filter((token) => token.length > 2);
    if (!tokens.length) return false;
    return tokens.some((token) => text.includes(token));
  });

  return uniqueKeywords(usable).slice(0, 8);
}

function checkProduct(product: StorefrontProduct, candidateKeywords: SeoPilotKeyword[]) {
  const checks: SeoPilotBrief['blockerChecks'] = [];
  const slug = productSlug(product);
  const title = productTitle(product);

  checks.push({
    label: 'Товарные факты',
    status: product.category_label || product.product_type ? 'pass' : 'blocker',
    note: product.category_label || product.product_type ? 'Есть category/product_type.' : 'Нет категории товара — нельзя безопасно писать SEO-текст.',
  });

  checks.push({
    label: 'Изображение',
    status: product.primary_image_url ? 'pass' : 'blocker',
    note: product.primary_image_url ? 'Есть основное изображение.' : 'Нет основного изображения.',
  });

  checks.push({
    label: 'Slug',
    status: slug && slug !== String(product.canonical_product_id || '') ? 'pass' : 'warning',
    note: slug && slug !== String(product.canonical_product_id || '') ? 'Slug выглядит пригодным.' : 'Slug слабый или похож на ID.',
  });

  checks.push({
    label: 'Цена',
    status: mainRegularPrice(product) ? 'pass' : 'warning',
    note: mainRegularPrice(product) ? 'Есть display price для preview.' : 'Цена не подтверждена в preview.',
  });

  checks.push({
    label: 'Ключи',
    status: candidateKeywords.length >= 3 ? 'warning' : 'blocker',
    note: candidateKeywords.length >= 3 ? 'Есть tier_1 кандидаты, но метрики ещё не validated.' : 'Недостаточно релевантных tier_1 ключей для пилота.',
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
  const checks = checkProduct(product, candidateKeywords);
  const status = resolveStatus(checks);
  const title = productTitle(product);
  const slug = productSlug(product);
  const category = clean(product.category_label || product.product_type, 'statement piece');
  const color = clean(product.canonical_color_label || product.color, 'signature');
  const world = clean(worldLabel(product), 'stage');
  const material = clean(product.material, 'atelier materials');
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
      { label: 'Цена preview', value: mainRegularPrice(product) ? `${mainRegularPrice(product)} ${product.currency || 'EUR'}` : 'нет подтверждённой цены' },
    ],
    candidateKeywords,
    blockerChecks: checks,
    draftPreview: {
      seoTitle: trimTo(`${title} | ${primaryKeyword} by TheFEYA`, 68),
      h1: title,
      metaDescription: trimTo(`${title} — handmade ${category.toLowerCase()} in ${color.toLowerCase()} tones for ${world.toLowerCase()}, stage styling and festival looks. Review product facts before publishing.`, 155),
      intro: `This is a controlled SEO preview for ${title}. The draft uses confirmed product facts first, then checks whether ${primaryKeyword} and ${secondaryKeyword} can support the page without inventing demand metrics.`,
      bullets: [
        `Product fact base: ${category}, ${color}, ${material}.`,
        `Visual context: ${world}.`,
        `Keyword candidates are not final until metric validation is attached.`,
        `No component, size, shipping or price claim should be published unless it exists in product facts.`,
      ],
    },
    decision: status === 'blocked'
      ? 'Не готово к SEO-черновику: сначала закрыть blocker checks.'
      : 'Готово к human draft preview, но не к публикации: нужны validated metrics и ручное утверждение.',
  };
}
