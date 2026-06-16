export type SeoStrategyCode =
  | 'part_focus'
  | 'material_visual_focus'
  | 'event_focus'
  | 'persona_style_focus'
  | 'image_seo_focus'
  | 'commercial_intent_focus'
  | 'experimental_niche_focus';

export type SeoStrategyProfile = {
  code: SeoStrategyCode;
  nameRu: string;
  descriptionRu: string;
  primaryBuckets: string[];
  limitedBuckets: string[];
  weights: {
    dna: number;
    buyerIntent: number;
    searchMetrics: number;
    seasonality: number;
    regionFit: number;
    antiCannibalization: number;
    experiment: number;
  };
};

export const SEO_STRATEGY_PROFILES: SeoStrategyProfile[] = [
  {
    code: 'part_focus',
    nameRu: 'Фокус на части товара',
    descriptionRu: 'Главный упор на то, что это за вещь: corset top, harness set, mask, bodysuit, skirt. Базовая стратегия для товарных страниц.',
    primaryBuckets: ['primary_product_keyword', 'secondary_product_keywords', 'category_keywords'],
    limitedBuckets: ['persona_style_keywords'],
    weights: { dna: 32, buyerIntent: 20, searchMetrics: 18, seasonality: 6, regionFit: 8, antiCannibalization: 14, experiment: 2 },
  },
  {
    code: 'material_visual_focus',
    nameRu: 'Фокус на материале и визуале',
    descriptionRu: 'Усиление материала, цвета и визуального эффекта: mirror acrylic, vegan leather, holographic, metallic gold. Хорошо для Google Images и визуального поиска.',
    primaryBuckets: ['material_keywords', 'image_seo_keywords', 'primary_product_keyword'],
    limitedBuckets: ['event_keywords', 'persona_style_keywords'],
    weights: { dna: 28, buyerIntent: 16, searchMetrics: 16, seasonality: 6, regionFit: 8, antiCannibalization: 16, experiment: 10 },
  },
  {
    code: 'event_focus',
    nameRu: 'Фокус на событии',
    descriptionRu: 'Упор на сценарий использования: stage outfit, festival outfit, Burning Man look, cosplay costume. Использовать аккуратно, чтобы не сделать все товары одинаковыми.',
    primaryBuckets: ['context_event_keywords', 'long_tail_buyer_keywords', 'primary_product_keyword'],
    limitedBuckets: ['persona_style_keywords'],
    weights: { dna: 24, buyerIntent: 24, searchMetrics: 18, seasonality: 14, regionFit: 8, antiCannibalization: 10, experiment: 2 },
  },
  {
    code: 'persona_style_focus',
    nameRu: 'Фокус на образе и стиле',
    descriptionRu: 'Упор на персонажный или стилевой вектор: goddess, robot, warrior, alien, drag queen. Подходит не всем товарам, нужен строгий контроль каннибализации.',
    primaryBuckets: ['persona_style_keywords', 'context_event_keywords', 'image_seo_keywords'],
    limitedBuckets: ['category_keywords'],
    weights: { dna: 24, buyerIntent: 16, searchMetrics: 12, seasonality: 8, regionFit: 6, antiCannibalization: 22, experiment: 12 },
  },
  {
    code: 'image_seo_focus',
    nameRu: 'Фокус на картинках',
    descriptionRu: 'Упор на image alt, file names, визуальные фразы и Google Images. Полезно для товаров, где внешний вид важнее обычной текстовой категории.',
    primaryBuckets: ['image_seo_keywords', 'material_keywords', 'primary_product_keyword'],
    limitedBuckets: [],
    weights: { dna: 24, buyerIntent: 14, searchMetrics: 14, seasonality: 4, regionFit: 8, antiCannibalization: 14, experiment: 22 },
  },
  {
    code: 'commercial_intent_focus',
    nameRu: 'Фокус на покупке',
    descriptionRu: 'Упор на покупательский смысл: handmade stagewear, performance outfit, festival costume. Использовать для страниц, где важна конверсия, а не только стиль.',
    primaryBuckets: ['long_tail_buyer_keywords', 'primary_product_keyword', 'secondary_product_keywords'],
    limitedBuckets: ['persona_style_keywords'],
    weights: { dna: 22, buyerIntent: 30, searchMetrics: 20, seasonality: 6, regionFit: 10, antiCannibalization: 10, experiment: 2 },
  },
  {
    code: 'experimental_niche_focus',
    nameRu: 'Экспериментальная ниша',
    descriptionRu: 'Нишевые гипотезы для слабых товаров или товаров без просмотров. Не использовать как основной массовый профиль.',
    primaryBuckets: ['persona_style_keywords', 'image_seo_keywords', 'long_tail_buyer_keywords'],
    limitedBuckets: ['category_keywords'],
    weights: { dna: 18, buyerIntent: 12, searchMetrics: 8, seasonality: 8, regionFit: 6, antiCannibalization: 18, experiment: 30 },
  },
];

export function getSeoStrategyProfile(code: string) {
  return SEO_STRATEGY_PROFILES.find((profile) => profile.code === code) || SEO_STRATEGY_PROFILES[0];
}
