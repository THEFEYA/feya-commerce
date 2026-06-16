import type { StorefrontProduct } from '@/lib/types';
import { categoryLabel, colorLabel, productTitle, worldLabel, productSlug } from '@/lib/storefront';

export type SeoKeywordBucket =
  | 'primary_product_keyword'
  | 'secondary_product_keywords'
  | 'long_tail_buyer_keywords'
  | 'material_keywords'
  | 'context_event_keywords'
  | 'image_seo_keywords'
  | 'category_keywords'
  | 'excluded_keywords';

export type SeoKeywordCandidateDraft = {
  keyword: string;
  bucket: SeoKeywordBucket;
  placement: string;
  source_code: 'product_dna' | 'manual_seed' | 'old_etsy_data';
  country_code: string;
  language_code: string;
  dna_relevance_score: number;
  buyer_intent_score: number;
  region_fit_score: number;
  anti_cannibalization_score: number;
  final_score: number;
  is_excluded: boolean;
  exclusion_reason?: string;
};

type ProductRecord = StorefrontProduct & Record<string, unknown>;

const REGION_DEFAULT = 'US';
const LANGUAGE_DEFAULT = 'en';
const BLOCKED_TERMS = ['free shipping', 'cheap', 'amazon', 'shein', 'temu', 'latex', 'bdsm', 'porn', 'stripper'];

function textValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function cleanKeyword(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function titleCase(value: string) {
  return cleanKeyword(value)
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function rawText(product: StorefrontProduct) {
  const record = product as ProductRecord;
  return [
    productTitle(product),
    product.product_type,
    product.category_label,
    product.material,
    product.color,
    product.world_label,
    product.meta_description,
    product.h1,
    product.seo_title,
    record.source_title,
    record.raw_title,
  ].map(textValue).join(' ').toLowerCase();
}

function productNoun(product: StorefrontProduct) {
  const category = categoryLabel(product);
  const text = rawText(product);
  if (/corset|bustier|breastplate|chest plate|acrylic top|overbust/.test(text) || category === 'Corsets') return 'corset top';
  if (/harness|garter|belt|choker|strap/.test(text) || category === 'Harness') return 'harness set';
  if (/mask|headpiece|helmet|crown/.test(text) || category === 'Masks') return 'mask';
  if (/bodysuit|body suit|catsuit|jumpsuit/.test(text) || category === 'Bodysuits') return 'bodysuit';
  if (/skirt/.test(text) || category === 'Skirts') return 'skirt';
  if (/armor|shoulder|bracer|arm|spine|tail|wing|robot/.test(text) || category === 'Armor') return 'armor piece';
  return cleanKeyword(category.replace(/s$/, '')) || 'stage look';
}

function materialKeyword(product: StorefrontProduct) {
  const text = rawText(product);
  if (/mirror\s*acrylic|acrylic/.test(text)) return 'mirror acrylic';
  if (/vegan\s*leather|faux\s*leather/.test(text)) return 'vegan leather';
  if (/holographic|iridescent|\bholo\b/.test(text)) return 'holographic';
  if (/mirror|metallic|reflective/.test(text)) return 'metallic mirror';
  if (/chain/.test(text)) return 'chain';
  return textValue(product.material) ? cleanKeyword(String(product.material)) : '';
}

function contextKeyword(product: StorefrontProduct) {
  const text = rawText(product);
  const world = worldLabel(product);
  if (/burning\s*man|desert/.test(text) || /burning/i.test(world)) return 'burning man outfit';
  if (/festival|rave|edm/.test(text) || /festival|rave/i.test(world)) return 'festival outfit';
  if (/stage|performance|show/.test(text) || /stage|performance/i.test(world)) return 'stage outfit';
  if (/editorial|photoshoot|red carpet/.test(text) || /editorial/i.test(world)) return 'editorial look';
  if (/cosplay|halloween/.test(text)) return 'cosplay costume';
  return world ? cleanKeyword(world) : '';
}

function styleKeywords(product: StorefrontProduct) {
  const text = rawText(product);
  const result: string[] = [];
  if (/goddess/.test(text)) result.push('goddess outfit');
  if (/robot|cyber|futuristic/.test(text)) result.push('futuristic costume');
  if (/cosmic|space|alien/.test(text)) result.push('cosmic outfit');
  if (/drag/.test(text)) result.push('drag queen outfit');
  if (/warrior|armor/.test(text)) result.push('warrior costume');
  if (/glam|gold|luxury/.test(text)) result.push('glam festival outfit');
  return result;
}

function scoreCandidate(keyword: string, bucket: SeoKeywordBucket) {
  const wordCount = keyword.split(' ').filter(Boolean).length;
  const longTailBoost = wordCount >= 3 ? 8 : 0;
  const broadPenalty = wordCount <= 1 ? 18 : 0;
  const bucketBoost = bucket === 'primary_product_keyword' ? 12 : bucket === 'long_tail_buyer_keywords' ? 10 : bucket === 'image_seo_keywords' ? 4 : 0;
  const dna = Math.max(50, Math.min(95, 76 + bucketBoost + longTailBoost - broadPenalty));
  const intent = Math.max(45, Math.min(92, 70 + longTailBoost + bucketBoost - broadPenalty));
  const region = 75;
  const anti = wordCount >= 3 ? 78 : 68;
  const finalScore = Math.round(dna * 0.3 + intent * 0.2 + 60 * 0.15 + 70 * 0.15 + 50 * 0.1 + region * 0.05 + anti * 0.05);
  return { dna, intent, region, anti, finalScore };
}

function candidate(keyword: string, bucket: SeoKeywordBucket, placement: string): SeoKeywordCandidateDraft | null {
  const cleaned = cleanKeyword(keyword);
  if (!cleaned || cleaned.length < 3) return null;
  const blocked = BLOCKED_TERMS.find((term) => cleaned.includes(term));
  const scores = scoreCandidate(cleaned, blocked ? 'excluded_keywords' : bucket);
  return {
    keyword: cleaned,
    bucket: blocked ? 'excluded_keywords' : bucket,
    placement,
    source_code: 'product_dna',
    country_code: REGION_DEFAULT,
    language_code: LANGUAGE_DEFAULT,
    dna_relevance_score: scores.dna,
    buyer_intent_score: scores.intent,
    region_fit_score: scores.region,
    anti_cannibalization_score: scores.anti,
    final_score: blocked ? 0 : scores.finalScore,
    is_excluded: Boolean(blocked),
    exclusion_reason: blocked ? `Blocked by internal rule: ${blocked}` : undefined,
  };
}

function uniqueCandidates(candidates: Array<SeoKeywordCandidateDraft | null>) {
  const seen = new Set<string>();
  return candidates
    .filter(Boolean)
    .filter((item) => {
      const key = `${item!.bucket}:${item!.keyword}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }) as SeoKeywordCandidateDraft[];
}

export function buildRuleBasedKeywordCandidates(product: StorefrontProduct) {
  const noun = productNoun(product);
  const color = cleanKeyword(colorLabel(product));
  const material = materialKeyword(product);
  const context = contextKeyword(product);
  const category = cleanKeyword(categoryLabel(product));
  const title = productTitle(product);
  const style = styleKeywords(product);

  return uniqueCandidates([
    candidate(`${color} ${noun}`, 'primary_product_keyword', 'seo_title,h1,slug'),
    candidate(`${material} ${noun}`, 'secondary_product_keywords', 'title,description,faq'),
    candidate(`${noun} for ${context}`, 'long_tail_buyer_keywords', 'meta_description,intro,faq'),
    candidate(`handmade ${noun}`, 'secondary_product_keywords', 'intro,description'),
    candidate(`${context}`, 'context_event_keywords', 'description,collection'),
    candidate(`${material}`, 'material_keywords', 'description,image_alt'),
    candidate(`${color} ${material} ${noun}`, 'image_seo_keywords', 'image_alt,image_filename'),
    candidate(category, 'category_keywords', 'collection,internal_links'),
    ...style.map((value) => candidate(value, 'persona_style_keywords' as SeoKeywordBucket, 'description,faq,collection')),
    candidate(title, 'excluded_keywords', 'source_reference'),
  ]).sort((a, b) => b.final_score - a.final_score);
}

export function buildKeywordCandidateInsertRows(product: StorefrontProduct) {
  const slug = productSlug(product);
  return buildRuleBasedKeywordCandidates(product).map((item) => ({
    canonical_product_id: product.canonical_product_id || null,
    product_slug: slug,
    page_type: 'product',
    keyword: item.keyword,
    source_code: item.source_code,
    source_status: 'active',
    country_code: item.country_code,
    language_code: item.language_code,
    dna_relevance_score: item.dna_relevance_score,
    buyer_intent_score: item.buyer_intent_score,
    region_fit_score: item.region_fit_score,
    anti_cannibalization_score: item.anti_cannibalization_score,
    final_score: item.final_score,
    bucket: item.bucket,
    placement: item.placement,
    is_excluded: item.is_excluded,
    exclusion_reason: item.exclusion_reason || null,
    raw_payload_json: {
      generator: 'rule_based_product_dna_v1',
      product_slug: slug,
    },
  }));
}
