import type { SeoAgentInputContract } from './seoPackContract.ts';

export type SeoCurrentFactSource =
  | 'current_product_truth'
  | 'current_storefront_offer'
  | 'owner_approved_brand_truth'
  | 'owner_approved_material_story'
  | 'owner_approved_product_fact';

export type SeoLegacyFactSource =
  | 'legacy_etsy_listing_text'
  | 'legacy_etsy_variation'
  | 'legacy_canonical_draft';

export type SeoEvidencePlacement = 'writer' | 'deterministic_only' | 'diagnostic_only';

export type SeoProductEvidenceFact = {
  fact_code: string;
  statement_en: string;
  source: SeoCurrentFactSource | SeoLegacyFactSource;
  placement: SeoEvidencePlacement;
  publishable: boolean;
};

export type SeoProductFactSheet = {
  contract_version: 'seo_product_evidence_v2';
  canonical_product_id: string;
  matched_etsy_listing_id: string | null;
  card_title: string | null;
  current_confirmed_facts: SeoProductEvidenceFact[];
  legacy_candidate_facts: SeoProductEvidenceFact[];
  visual_observations: string[];
};

export type FactSheetViewRow = {
  canonical_product_id: string;
  matched_etsy_listing_id: string | null;
  card_title: string | null;
  canonical_material: string | null;
  canonical_color: string | null;
  raw_variation_1_name: string | null;
  raw_variation_1_values: string | null;
  raw_variation_2_name: string | null;
  raw_variation_2_values: string | null;
  raw_kit_includes_section: string | null;
  fact_adjustable_straps: boolean | null;
  fact_lightweight: boolean | null;
  fact_handmade: boolean | null;
  fact_custom_sizing: boolean | null;
  fact_engraving_option: boolean | null;
  fact_rush_orders: boolean | null;
  fact_gift_packaging: boolean | null;
  fact_pieces_sold_separately: boolean | null;
};

export const SEO_PRODUCT_FACT_SHEET_VIEW = 'feya_v_product_fact_sheet_v1';

const PRODUCT_SPECIFIC_WRITER_FACTS: Record<string, Array<{
  fact_code: string;
  statement_en: string;
}>> = {
  'de38a842-37c4-40a7-86b4-393341c4c9aa': [
    {
      fact_code: 'brown_leather_harness_identity',
      statement_en: 'This product is a brown leather chest harness with a classic, vintage-inspired character.',
    },
    {
      fact_code: 'leather_harness_repeat_wear',
      statement_en: 'With appropriate care, the leather harness is suited to repeat wear.',
    },
    {
      fact_code: 'leather_harness_upper_body_framing',
      statement_en: 'The chest-harness strap layout frames the upper body.',
    },
  ],
  'f473fb62-0440-473c-a7fb-a52dccafebc6': [
    {
      fact_code: 'spine_tail_continuous_backpiece',
      statement_en: 'The sculptural extension follows the back as a spine and continues below the waist as a tail; it is one continuous design detail.',
    },
    {
      fact_code: 'red_gloss_stage_visibility',
      statement_en: 'The smooth red surface has a high-gloss finish that keeps the sculptural detail clear under stage lighting.',
    },
    {
      fact_code: 'spine_tail_shape_retention',
      statement_en: 'With careful storage, the sculptural backpiece keeps its shape between wears.',
    },
  ],
  'ffa74da5-c2e1-4c3a-b460-50d1aae09f56': [
    {
      fact_code: 'stretch_fabric_gold_detail_construction',
      statement_en: 'The costume has a stretch-fabric base with selected patterns and details made from gold mirror-finish vegan leather.',
    },
    {
      fact_code: 'stretch_fabric_dance_movement',
      statement_en: 'The stretch-fabric base moves with the wearer through dance and stage choreography.',
    },
    {
      fact_code: 'gold_detail_stage_visibility',
      statement_en: 'The gold mirror-finish details catch available stage light and keep the decorative pattern visible during performance.',
    },
  ],
};

const PRODUCT_SPECIFIC_MATERIAL_STORY = new Set([
  'f473fb62-0440-473c-a7fb-a52dccafebc6',
  'ffa74da5-c2e1-4c3a-b460-50d1aae09f56',
]);

const LEGACY_FLAG_LABELS: ReadonlyArray<{
  column: keyof FactSheetViewRow;
  fact_code: string;
}> = [
  { column: 'fact_adjustable_straps', fact_code: 'adjustable_straps' },
  { column: 'fact_lightweight', fact_code: 'lightweight' },
  { column: 'fact_handmade', fact_code: 'handmade' },
  { column: 'fact_custom_sizing', fact_code: 'custom_sizing' },
  { column: 'fact_engraving_option', fact_code: 'engraving_option' },
  { column: 'fact_rush_orders', fact_code: 'rush_orders' },
  { column: 'fact_gift_packaging', fact_code: 'gift_packaging' },
  { column: 'fact_pieces_sold_separately', fact_code: 'pieces_sold_separately' },
];

/**
 * Maps the legacy read-only view without promoting any Etsy-derived flag to a
 * current publishable fact. This mapper is safe to use for diagnostics only.
 */
export function mapFactSheetRow(row: FactSheetViewRow): SeoProductFactSheet {
  const legacyCandidateFacts: SeoProductEvidenceFact[] = [];

  LEGACY_FLAG_LABELS.forEach(({ column, fact_code }) => {
    if (row[column] === true) {
      legacyCandidateFacts.push(legacyFact(
        fact_code,
        `Legacy seller text suggests ${fact_code.replaceAll('_', ' ')}; current confirmation is required.`,
        'legacy_etsy_listing_text',
      ));
    }
  });

  if (row.canonical_material) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_material_candidate',
      `Legacy/canonical draft material candidate: ${row.canonical_material}.`,
      'legacy_canonical_draft',
    ));
  }
  if (row.canonical_color) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_color_candidate',
      `Legacy/canonical draft color candidate: ${row.canonical_color}.`,
      'legacy_canonical_draft',
    ));
  }
  if (row.raw_kit_includes_section) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_kit_section_present',
      'A legacy Etsy kit/includes section exists and is excluded from writer evidence.',
      'legacy_etsy_listing_text',
    ));
  }
  if (row.raw_variation_1_values || row.raw_variation_2_values) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_variations_present',
      'Legacy Etsy variation labels exist and cannot override the current storefront selector.',
      'legacy_etsy_variation',
    ));
  }

  return {
    contract_version: 'seo_product_evidence_v2',
    canonical_product_id: row.canonical_product_id,
    matched_etsy_listing_id: row.matched_etsy_listing_id,
    card_title: row.card_title,
    current_confirmed_facts: [],
    legacy_candidate_facts: uniqueFacts(legacyCandidateFacts),
    visual_observations: [],
  };
}

/**
 * Builds the writer evidence from the current runtime contract. Raw Etsy text,
 * legacy variations and prior included-component arrays are represented only
 * as non-publishable diagnostics and are omitted from the writer brief.
 */
export function buildCurrentSeoProductEvidence(input: SeoAgentInputContract): SeoProductFactSheet {
  const product = input.product;
  const offer = product.sellable_offer;
  const productId = input.canonical_product_id;
  const currentConfirmedFacts: SeoProductEvidenceFact[] = [
    currentFact(
      'original_authorial_design',
      'Original studio design developed for festival and stage fashion.',
      'owner_approved_brand_truth',
      'writer',
    ),
  ];
  const legacyCandidateFacts: SeoProductEvidenceFact[] = [];

  if (product.title?.trim()) {
    currentConfirmedFacts.push(currentFact(
      'current_product_identity',
      product.title.trim(),
      'current_product_truth',
      'writer',
    ));
  }
  if (product.material?.trim()) {
    currentConfirmedFacts.push(currentFact(
      'current_material',
      `Material: ${product.material.trim()}.`,
      'current_product_truth',
      'deterministic_only',
    ));
    if (!PRODUCT_SPECIFIC_MATERIAL_STORY.has(productId)) {
      currentConfirmedFacts.push(...materialStoryFacts(product.material, product.color));
    }
  }
  if (product.color?.trim()) {
    currentConfirmedFacts.push(currentFact(
      'current_color',
      `Color: ${product.color.trim()}.`,
      'current_product_truth',
      'writer',
    ));
  }
  (PRODUCT_SPECIFIC_WRITER_FACTS[productId] || []).forEach((fact) => {
    currentConfirmedFacts.push(currentFact(
      fact.fact_code,
      fact.statement_en,
      'owner_approved_product_fact',
      'writer',
    ));
  });
  if (offer?.status === 'ready') {
    currentConfirmedFacts.push(currentFact(
      'current_sellable_components',
      `Current selector components: ${offer.component_labels.join(', ') || 'none'}.`,
      'current_storefront_offer',
      'deterministic_only',
    ));
    offer.aggregate_options.forEach((option) => {
      currentConfirmedFacts.push(currentFact(
        `aggregate_configuration_${option.code}`,
        `${option.label} is an aggregate purchase configuration whose current members are ${option.member_labels.join(', ')}.`,
        'current_storefront_offer',
        'deterministic_only',
      ));
    });

  }

  if (product.source_description_fragment) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_source_description_present',
      'A legacy source-description fragment exists and is excluded from writer evidence.',
      'legacy_etsy_listing_text',
    ));
  }
  if (product.source_variations?.length) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_source_variations_present',
      'Legacy source variations exist and cannot change current sellable composition.',
      'legacy_etsy_variation',
    ));
  }
  if (product.option_price_rows?.length) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_option_rows_present',
      'Legacy option-price rows exist and cannot change current sellable composition.',
      'legacy_etsy_variation',
    ));
  }
  if (product.legacy_product_truth_included_components?.length) {
    legacyCandidateFacts.push(legacyFact(
      'legacy_component_snapshot_present',
      'A prior Product Truth component snapshot exists and is excluded when the current selector is ready.',
      'legacy_canonical_draft',
    ));
  }

  return {
    contract_version: 'seo_product_evidence_v2',
    canonical_product_id: input.canonical_product_id,
    matched_etsy_listing_id: input.matched_etsy_listing_id || null,
    card_title: product.title || null,
    current_confirmed_facts: uniqueFacts(currentConfirmedFacts),
    legacy_candidate_facts: uniqueFacts(legacyCandidateFacts),
    visual_observations: [],
  };
}

function materialStoryFacts(material: string, color: string | null | undefined): SeoProductEvidenceFact[] {
  const normalized = material.toLowerCase();
  const facts: SeoProductEvidenceFact[] = [];
  const finishFact = colorAwareFinishFact(color);

  if (/vegan leather|faux leather/.test(normalized)) {
    facts.push(
      finishFact,
      currentFact(
        'material_body_comfort',
        'The material feels comfortable against the body.',
        'owner_approved_material_story',
        'writer',
      ),
      currentFact(
        'material_shape_retention',
        'The material helps the piece keep its shape between wears.',
        'owner_approved_material_story',
        'writer',
      ),
    );
  }

  if (/mirror acrylic|acrylic mirror|mirror plastic/.test(normalized)) {
    facts.push(
      finishFact,
      currentFact(
        'material_event_light_camera',
        'Surface stays visually clear under event lighting and on camera.',
        'owner_approved_material_story',
        'writer',
      ),
    );
  }

  return facts;
}

/**
 * "Mirror" describes the studio's smooth glossy surface family, not one
 * universal optical behavior. The customer-facing finish must follow the
 * confirmed color instead of turning every shade into metal, reflection,
 * glitter or iridescence.
 */
function colorAwareFinishFact(color: string | null | undefined): SeoProductEvidenceFact {
  const normalized = String(color || '').trim().toLowerCase();

  if (/\b(?:holographic|hologram|iridescent)\b/.test(normalized)) {
    return currentFact(
      'material_glossy_holographic_shift',
      'The smooth, shiny holographic surface shows subtle color shifts in changing light and movement.',
      'owner_approved_material_story',
      'writer',
    );
  }

  if (/\b(?:gold|silver)\b/.test(normalized)) {
    return currentFact(
      'material_glossy_metal_inspired_finish',
      `The smooth, high-gloss ${normalized.includes('gold') ? 'gold' : 'silver'} surface has a polished, metal-inspired appearance.`,
      'owner_approved_material_story',
      'writer',
    );
  }

  if (/\b(?:black|red|white)\b/.test(normalized)) {
    const shade = normalized.match(/\b(?:black|red|white)\b/)?.[0] || 'colored';
    return currentFact(
      'material_glossy_latex_like_finish',
      `The smooth, high-gloss ${shade} surface creates a sleek, latex-like appearance.`,
      'owner_approved_material_story',
      'writer',
    );
  }

  return currentFact(
    'material_smooth_glossy_finish',
    'The smooth, high-gloss surface gives the piece a clean, polished finish.',
    'owner_approved_material_story',
    'writer',
  );
}

function currentFact(
  fact_code: string,
  statement_en: string,
  source: SeoCurrentFactSource,
  placement: SeoEvidencePlacement,
): SeoProductEvidenceFact {
  return { fact_code, statement_en, source, placement, publishable: true };
}

function legacyFact(
  fact_code: string,
  statement_en: string,
  source: SeoLegacyFactSource,
): SeoProductEvidenceFact {
  return { fact_code, statement_en, source, placement: 'diagnostic_only', publishable: false };
}

function uniqueFacts(facts: SeoProductEvidenceFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.source}:${fact.fact_code}:${fact.statement_en}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
