// FEYA Human Copy v2 - step 1.
// Pure mapping layer over the read-only Supabase view public.feya_v_product_fact_sheet_v1.
// The view assembles per-product buyer-facing fact candidates from the seller's own
// Etsy listing text, canonical draft fields and active component assertions.
// Dependency-free and not wired into generation yet: the caller (server route)
// fetches one view row and passes it here. Rollback: delete this file.

export type SeoProductFactSource = 'seller_listing_text' | 'canonical_draft';

export type SeoProductConfirmedFact = {
  fact_code: string;
  statement_en: string;
  source: SeoProductFactSource;
};

export type SeoProductFactSheet = {
  contract_version: 'seo_product_fact_sheet_v1';
  canonical_product_id: string;
  matched_etsy_listing_id: string | null;
  card_title: string | null;
  raw_kit_includes_section: string | null;
  variation_option_labels: string[];
  confirmed_facts: SeoProductConfirmedFact[];
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

const FLAG_FACTS: ReadonlyArray<{
  column: keyof FactSheetViewRow;
  fact_code: string;
  statement_en: string;
}> = [
  {
    column: 'fact_adjustable_straps',
    fact_code: 'adjustable_straps',
    statement_en: 'Adjustable straps let the buyer fine-tune the fit.',
  },
  {
    column: 'fact_lightweight',
    fact_code: 'lightweight',
    statement_en: 'The piece is lightweight enough for extended wear.',
  },
  {
    column: 'fact_custom_sizing',
    fact_code: 'custom_sizing',
    statement_en: 'Custom sizing is available on request before production.',
  },
  {
    column: 'fact_engraving_option',
    fact_code: 'engraving_option',
    statement_en: 'Personalized details such as engraving can be requested.',
  },
  {
    column: 'fact_pieces_sold_separately',
    fact_code: 'pieces_sold_separately',
    statement_en: 'The pieces can be bought separately or as the full set.',
  },
];

function splitVariationValues(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function mapFactSheetRow(row: FactSheetViewRow): SeoProductFactSheet {
  const confirmedFacts: SeoProductConfirmedFact[] = [];
  for (const flag of FLAG_FACTS) {
    if (row[flag.column] === true) {
      confirmedFacts.push({
        fact_code: flag.fact_code,
        statement_en: flag.statement_en,
        source: 'seller_listing_text',
      });
    }
  }
  if (row.canonical_material) {
    confirmedFacts.push({
      fact_code: 'material',
      statement_en: `Material on record: ${row.canonical_material}.`,
      source: 'canonical_draft',
    });
  }
  return {
    contract_version: 'seo_product_fact_sheet_v1',
    canonical_product_id: row.canonical_product_id,
    matched_etsy_listing_id: row.matched_etsy_listing_id,
    card_title: row.card_title,
    raw_kit_includes_section: row.raw_kit_includes_section,
    variation_option_labels: [
      ...splitVariationValues(row.raw_variation_1_values),
      ...splitVariationValues(row.raw_variation_2_values),
    ],
    confirmed_facts: confirmedFacts,
  };
}
