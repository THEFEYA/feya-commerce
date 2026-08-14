import assert from 'node:assert/strict';
import test from 'node:test';
import {
  normalizeStrategy,
  recommendCatalogKeywords,
} from '../../lib/seoCatalogKeywordRecommendation.ts';

const baseMetric = {
  review_status: 'approved_draft',
  competition: 'LOW',
  competition_index: 10,
  metric_source: 'google_keyword_planner',
  last_checked: '2026-07-08',
  score: 70,
};

test('auto recommendation applies Product Truth mismatch gates before search volume', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Futuristic Shoulder Armor and Arm Bracers',
      canonical_color_label: 'Gold',
      world_label: 'Cyber Futuristic',
      parent_components_json: ['Shoulders', 'Arms'],
      child_components_json: ['shoulder_piece', 'bracers'],
      material: 'Faux leather',
    },
    focus: {
      component: ['shoulder armor', 'bracers'],
      style: ['futuristic'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold shoulders', keyword_norm: 'gold shoulders', bank_bucket: 'product_or_alt', avg_monthly_searches: 110 },
      { ...baseMetric, keyword: 'futuristic shoulder armor', keyword_norm: 'futuristic shoulder armor', bank_bucket: 'product', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'gold bodysuit', keyword_norm: 'gold bodysuit', bank_bucket: 'product_or_alt', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'choke chain gold', keyword_norm: 'choke chain gold', bank_bucket: 'product_or_alt', avg_monthly_searches: 200000 },
      { ...baseMetric, keyword: 'lego gold shoulder armor', keyword_norm: 'lego gold shoulder armor', bank_bucket: 'product_or_alt', avg_monthly_searches: 300000 },
      { ...baseMetric, keyword: 'silver shoulder armor', keyword_norm: 'silver shoulder armor', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'where to buy shoulder armor', keyword_norm: 'where to buy shoulder armor', bank_bucket: 'faq', page_type: 'FAQ', avg_monthly_searches: 50 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('gold bodysuit'), false);
  assert.equal(keywords.includes('choke chain gold'), false);
  assert.equal(keywords.includes('lego gold shoulder armor'), false);
  assert.equal(keywords.includes('silver shoulder armor'), false);
  assert.equal(keywords.includes('gold shoulders'), true);
  assert.equal(keywords.includes('where to buy shoulder armor'), true);
  assert.equal(result.keywords.find((row) => row.role === 'primary')?.keyword_norm, 'futuristic shoulder armor');
  assert.equal(result.diagnostics.confirmation_required, true);
});

test('Burning Man is an event and does not infer a male audience', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Best Festival Armor Outfit for Burning Man',
      canonical_color_label: 'Gold',
      parent_components_json: ['Shoulders', 'Skirt'],
    },
    focus: {
      component: ['shoulders', 'skirt'],
      event: ['burning man', 'festival'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'women festival armor', keyword_norm: 'women festival armor', bank_bucket: 'product', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'mens festival armor', keyword_norm: 'mens festival armor', bank_bucket: 'product', avg_monthly_searches: 90000 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(result.diagnostics.product_audiences.includes('men'), false);
  assert.equal(result.diagnostics.product_audiences.includes('women'), true);
  assert.equal(keywords.includes('women festival armor'), true);
  assert.equal(keywords.includes('mens festival armor'), false);
});

test('operator event focus rejects a legacy-title rave keyword before scoring', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Rave Festival Armor Outfit for Burning Man',
      canonical_color_label: 'Gold',
      included_components: ['Shoulders', 'Skirt'],
    },
    focus: {
      component: ['shoulders', 'skirt'],
      material: ['gold'],
      event: ['burning man', 'festival'],
      persona: ['warrior'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'warrior armor costume', keyword_norm: 'warrior armor costume', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'festival skirt set', keyword_norm: 'festival skirt set', bank_bucket: 'product', avg_monthly_searches: 110 },
      { ...baseMetric, keyword: 'tennis skirt festival outfit', keyword_norm: 'tennis skirt festival outfit', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'gold rave skirt', keyword_norm: 'gold rave skirt', bank_bucket: 'product_or_alt', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'gold rave outfit', keyword_norm: 'gold rave outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 100000 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('warrior armor costume'), true);
  assert.equal(keywords.includes('festival skirt set'), true);
  assert.equal(keywords.includes('tennis skirt festival outfit'), false);
  assert.equal(keywords.includes('gold rave skirt'), false);
  assert.equal(keywords.includes('gold rave outfit'), false);
  assert.deepEqual(result.diagnostics.product_events, ['burning man', 'festival']);
});

test('operator minus-words reject a candidate before scoring', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Shoulder Armor',
      canonical_color_label: 'Gold',
      parent_components_json: ['Shoulders'],
    },
    focus: { component: ['shoulders'], exclude: ['cyberpunk'] },
    approvedKeywords: [
      { ...baseMetric, keyword: 'cyberpunk shoulder armor', keyword_norm: 'cyberpunk shoulder armor', bank_bucket: 'product', avg_monthly_searches: 2000 },
      { ...baseMetric, keyword: 'gold shoulder armor', keyword_norm: 'gold shoulder armor', bank_bucket: 'product', avg_monthly_searches: 200 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('cyberpunk shoulder armor'), false);
  assert.equal(keywords.includes('gold shoulder armor'), true);
});

test('unsupported chain and historical-style details cannot ride on a matching gold headpiece', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Futuristic Warrior Headpiece',
      canonical_color_label: 'Gold',
      included_components: ['Headpiece'],
      material: 'Vegan leather',
    },
    focus: {
      component: ['headpiece'],
      event: ['festival'],
      style: ['futuristic', 'fantasy'],
      persona: ['warrior'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold festival headpiece', keyword_norm: 'gold festival headpiece', bank_bucket: 'product', avg_monthly_searches: 100 },
      { ...baseMetric, keyword: 'gold headpiece chain', keyword_norm: 'gold headpiece chain', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'gold roman headpiece', keyword_norm: 'gold roman headpiece', bank_bucket: 'product', avg_monthly_searches: 90000 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('gold festival headpiece'), true);
  assert.equal(keywords.includes('gold headpiece chain'), false);
  assert.equal(keywords.includes('gold roman headpiece'), false);
});

test('mixed false colors, feather and coin details cannot ride on a matching gold headpiece', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Futuristic Warrior Headpiece',
      canonical_color_label: 'Gold',
      included_components: ['Headpiece'],
      material: 'Vegan leather',
    },
    focus: {
      component: ['headpiece'],
      material: ['gold'],
      event: ['festival'],
      style: ['futuristic', 'fantasy'],
      persona: ['warrior'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold festival headpiece', keyword_norm: 'gold festival headpiece', bank_bucket: 'product', avg_monthly_searches: 100 },
      { ...baseMetric, keyword: 'black and gold feather headpiece', keyword_norm: 'black and gold feather headpiece', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'gold coin headpiece', keyword_norm: 'gold coin headpiece', bank_bucket: 'product', avg_monthly_searches: 90000 },
      { ...baseMetric, keyword: 'gold medusa headpiece', keyword_norm: 'gold medusa headpiece', bank_bucket: 'product', avg_monthly_searches: 80000 },
      { ...baseMetric, keyword: 'gold crown headpiece', keyword_norm: 'gold crown headpiece', bank_bucket: 'product', avg_monthly_searches: 70000 },
      { ...baseMetric, keyword: 'gold butterfly headpiece', keyword_norm: 'gold butterfly headpiece', bank_bucket: 'product', avg_monthly_searches: 60000 },
      { ...baseMetric, keyword: 'beyonce gold headpiece', keyword_norm: 'beyonce gold headpiece', bank_bucket: 'product', avg_monthly_searches: 50000 },
      { ...baseMetric, keyword: 'ahsoka headpiece for sale', keyword_norm: 'ahsoka headpiece for sale', bank_bucket: 'commercial_collection', avg_monthly_searches: 40000 },
      { ...baseMetric, keyword: 'womens festival tops', keyword_norm: 'womens festival tops', bank_bucket: 'collection', avg_monthly_searches: 30000 },
      { ...baseMetric, keyword: 'long sleeve festival tops', keyword_norm: 'long sleeve festival tops', bank_bucket: 'collection', avg_monthly_searches: 20000 },
      { ...baseMetric, keyword: 'neon festival tops', keyword_norm: 'neon festival tops', bank_bucket: 'collection', avg_monthly_searches: 10000 },
      { ...baseMetric, keyword: 'festival head piece', keyword_norm: 'festival head piece', bank_bucket: 'collection', avg_monthly_searches: 10 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('gold festival headpiece'), true);
  assert.equal(keywords.includes('black and gold feather headpiece'), false);
  assert.equal(keywords.includes('gold coin headpiece'), false);
  assert.equal(keywords.includes('gold medusa headpiece'), false);
  assert.equal(keywords.includes('gold crown headpiece'), false);
  assert.equal(keywords.includes('gold butterfly headpiece'), false);
  assert.equal(keywords.includes('beyonce gold headpiece'), false);
  assert.equal(keywords.includes('ahsoka headpiece for sale'), false);
  assert.equal(keywords.includes('womens festival tops'), false);
  assert.equal(keywords.includes('long sleeve festival tops'), false);
  assert.equal(keywords.includes('neon festival tops'), false);
  assert.equal(keywords.includes('festival head piece'), true);
});

test('automatic recommendations remain review candidates and never claim confirmation', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Silver Stage Bodysuit',
      canonical_color_label: 'Silver',
      parent_components_json: ['Bodysuit'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'silver bodysuit', keyword_norm: 'silver bodysuit', bank_bucket: 'product_or_alt', avg_monthly_searches: 1000 },
      { ...baseMetric, keyword: 'metallic bodysuit', keyword_norm: 'metallic bodysuit', bank_bucket: 'product_or_alt', avg_monthly_searches: 720 },
      { ...baseMetric, keyword: 'stage bodysuit', keyword_norm: 'stage bodysuit', bank_bucket: 'product', avg_monthly_searches: 90 },
    ],
  });

  assert.ok(result.keywords.length >= 2);
  assert.ok(result.keywords.every((row) => row.auto_recommendation_needs_human_confirmation === true));
  assert.equal(result.diagnostics.writes_performed, 0);
});

test('multi-component Product Truth cannot receive a component-only primary keyword', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Armor Outfit with Shoulder Armor, Harness and Skirt',
      canonical_color_label: 'Gold',
      included_components: ['Shoulders', 'Harness', 'Skirt'],
    },
    focus: {
      component: ['shoulders', 'harness', 'skirt'],
      event: ['Burning Man', 'festival', 'rave'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold shoulder armor', keyword_norm: 'gold shoulder armor', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'gold shoulder armor costume', keyword_norm: 'gold shoulder armor costume', bank_bucket: 'product', avg_monthly_searches: 95000 },
      { ...baseMetric, keyword: 'gold shoulders', keyword_norm: 'gold shoulders', bank_bucket: 'product_or_alt', avg_monthly_searches: 90000 },
      { ...baseMetric, keyword: 'gold festival outfit', keyword_norm: 'gold festival outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
      { ...baseMetric, keyword: 'harness festival outfit', keyword_norm: 'harness festival outfit', bank_bucket: 'product', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'rave skirt outfits', keyword_norm: 'rave skirt outfits', bank_bucket: 'product', avg_monthly_searches: 70 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.ok(primary);
  assert.equal(primary?.whole_product_intent, true);
  assert.notEqual(primary?.keyword_norm, 'gold shoulder armor');
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'gold shoulder armor')?.role, 'secondary');
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'gold shoulder armor costume')?.role, 'secondary');
  assert.equal(result.diagnostics.product_presentation_mode, 'compact_set');
  assert.equal(result.diagnostics.confirmed_component_count, 3);
  assert.equal(result.diagnostics.auto_primary_scope, 'whole_product_or_single_component');
});

test('compound Product Truth labels cannot hide a component-led whole-product query', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Armor Outfit',
      canonical_color_label: 'Gold',
      included_components: ['Harness Top', 'Shoulders', 'Skirt', 'Top'],
    },
    focus: {
      component: ['harness', 'shoulders', 'skirt', 'top'],
      event: ['festival'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'harness outfit festival', keyword_norm: 'harness outfit festival', bank_bucket: 'product', avg_monthly_searches: 10000 },
      { ...baseMetric, keyword: 'gold festival armor outfit', keyword_norm: 'gold festival armor outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'harness outfit festival')?.whole_product_intent,
    false,
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'harness outfit festival')?.role,
    'secondary',
  );
  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'gold festival armor outfit',
  );
});

test('whole-product-first syntax may name one confirmed component without becoming component-only', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Silver Rave Outfit with Shoulder Pieces and Skirt',
      canonical_color_label: 'Silver',
      included_components: ['Shoulders', 'Skirt'],
    },
    focus: {
      component: ['shoulders', 'skirt'],
      material: ['silver'],
      event: ['festival', 'rave'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'silver skirt outfit', keyword_norm: 'silver skirt outfit', bank_bucket: 'product_or_alt', avg_monthly_searches: 140 },
      { ...baseMetric, keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', bank_bucket: 'product', avg_monthly_searches: 30 },
      { ...baseMetric, keyword: 'rave skirt outfits', keyword_norm: 'rave skirt outfits', bank_bucket: 'product', avg_monthly_searches: 70 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'rave outfit with skirt',
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'rave outfit with skirt')?.whole_product_intent,
    true,
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'silver skirt outfit')?.role,
    'secondary',
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'rave skirt outfits')?.whole_product_intent,
    false,
  );
});

test('an anatomical harness query requires matching Product Truth anatomy', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Harness Outfit',
      canonical_color_label: 'Gold',
      included_components: ['Harness Top', 'Shoulders', 'Skirt', 'Top'],
    },
    focus: {
      component: ['harness', 'shoulders', 'skirt', 'top'],
      event: ['festival'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'festival leg harness', keyword_norm: 'festival leg harness', bank_bucket: 'product', avg_monthly_searches: 50000 },
      { ...baseMetric, keyword: 'leg harness rave', keyword_norm: 'leg harness rave', bank_bucket: 'product', avg_monthly_searches: 40000 },
      { ...baseMetric, keyword: 'gold festival outfit', keyword_norm: 'gold festival outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('festival leg harness'), false);
  assert.equal(keywords.includes('leg harness rave'), false);
  assert.equal(keywords.includes('gold festival outfit'), true);
});

test('plus-size positioning is held unless Product Truth names it explicitly', () => {
  const unsupported = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Outfit',
      canonical_color_label: 'Gold',
      included_components: ['Harness Top', 'Skirt'],
      source_variations_json: [{ raw_variation_name: 'Size', values: ['2X', '3X', '4X'] }],
    },
    focus: { event: ['festival'] },
    approvedKeywords: [
      { ...baseMetric, keyword: 'plus size gold festival outfits', keyword_norm: 'plus size gold festival outfits', bank_bucket: 'product', avg_monthly_searches: 5000 },
      { ...baseMetric, keyword: 'gold festival armor outfit', keyword_norm: 'gold festival armor outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });
  assert.equal(
    unsupported.keywords.some((row) => row.keyword_norm === 'plus size gold festival outfits'),
    false,
  );

  const supported = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Outfit',
      canonical_color_label: 'Gold',
      included_components: ['Harness Top', 'Skirt'],
      confirmed_size_range: 'Plus size',
    },
    focus: { event: ['festival'] },
    approvedKeywords: [
      { ...baseMetric, keyword: 'plus size gold festival outfits', keyword_norm: 'plus size gold festival outfits', bank_bucket: 'product', avg_monthly_searches: 5000 },
      { ...baseMetric, keyword: 'gold festival armor outfit', keyword_norm: 'gold festival armor outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });
  assert.equal(
    supported.keywords.some((row) => row.keyword_norm === 'plus size gold festival outfits'),
    true,
  );
});

test('the current Etsy 4340584466 selector overrides stale Product Truth and rejects false component queries', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Best Festival Armor Outfit - Leather Shoulders & Skirt, Gold Metallic Harness',
      product_type: 'costume_component_or_set',
      canonical_color_label: 'Gold',
      material: 'Vegan leather',
      sellable_offer_components: ['Shoulders', 'Skirt'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Shoulders', 'Skirt'],
      },
      // Preserved only to prove that stale canonical evidence cannot override
      // the current v4 selector.
      included_components: ['Harness Top', 'Shoulders', 'Skirt', 'Top'],
      source_variations_json: [{
        raw_variation_name: 'Choose Your Set',
        values: ['Shoulders', 'Skirt', 'Bracelets', 'Shoulders & Skirt', 'Full Set'],
      }, {
        raw_variation_name: 'Size',
        values: ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2X', '3X', '4X'],
      }],
    },
    focus: {
      component: ['shoulders', 'top', 'harness', 'skirt'],
      material: ['gold'],
      event: ['burning man', 'festival'],
      persona: ['warrior'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'harness outfit festival', keyword_norm: 'harness outfit festival', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'festival leg harness', keyword_norm: 'festival leg harness', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'plus size rave attire', keyword_norm: 'plus size rave attire', bank_bucket: 'faq', avg_monthly_searches: 4400 },
      { ...baseMetric, keyword: 'gold shoulder armor', keyword_norm: 'gold shoulder armor', bank_bucket: 'product_or_alt', avg_monthly_searches: 210 },
      { ...baseMetric, keyword: 'metallic top and skirt set', keyword_norm: 'metallic top and skirt set', bank_bucket: 'product_or_alt', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'skirt and top set festival', keyword_norm: 'skirt and top set festival', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'warrior armor costume', keyword_norm: 'warrior armor costume', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'robot armor costume', keyword_norm: 'robot armor costume', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'sci fi armor costume', keyword_norm: 'sci fi armor costume', bank_bucket: 'product', avg_monthly_searches: 90000 },
      { ...baseMetric, keyword: 'futuristic armor costume', keyword_norm: 'futuristic armor costume', bank_bucket: 'product', avg_monthly_searches: 80000 },
      { ...baseMetric, keyword: 'sparkly festival top', keyword_norm: 'sparkly festival top', bank_bucket: 'collection', avg_monthly_searches: 70000 },
      { ...baseMetric, keyword: 'festival outfits shorts and top', keyword_norm: 'festival outfits shorts and top', bank_bucket: 'collection', avg_monthly_searches: 60000 },
      { ...baseMetric, keyword: 'shorts and top set festival', keyword_norm: 'shorts and top set festival', bank_bucket: 'collection', avg_monthly_searches: 50000 },
      { ...baseMetric, keyword: 'mid size rave outfits', keyword_norm: 'mid size rave outfits', bank_bucket: 'faq', avg_monthly_searches: 40000 },
      { ...baseMetric, keyword: 'rose gold festival outfit', keyword_norm: 'rose gold festival outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 30000 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('festival leg harness'), false);
  assert.equal(keywords.includes('plus size rave attire'), false);
  assert.equal(keywords.includes('robot armor costume'), false);
  assert.equal(keywords.includes('sci fi armor costume'), false);
  assert.equal(keywords.includes('futuristic armor costume'), false);
  assert.equal(keywords.includes('sparkly festival top'), false);
  assert.equal(keywords.includes('festival outfits shorts and top'), false);
  assert.equal(keywords.includes('shorts and top set festival'), false);
  assert.equal(keywords.includes('mid size rave outfits'), false);
  assert.equal(keywords.includes('rose gold festival outfit'), false);
  assert.equal(keywords.includes('skirt and top set festival'), false);
  assert.equal(keywords.includes('metallic top and skirt set'), false);
  assert.equal(keywords.includes('harness outfit festival'), false);
  assert.equal(keywords.includes('warrior armor costume'), true);
  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'warrior armor costume',
  );
  assert.deepEqual(result.diagnostics.product_component_families, ['shoulders', 'skirt']);
  assert.equal(result.diagnostics.confirmed_component_count, 2);
  assert.equal(result.diagnostics.auto_primary_scope, 'whole_product_or_single_component');
});

test('word-order permutations represent one keyword intent', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Harness Top',
      canonical_color_label: 'Gold',
      included_components: ['Top', 'Harness'],
      material: 'Vegan leather',
    },
    focus: {
      component: ['top', 'harness'],
      event: ['festival'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'festival harness outfit', keyword_norm: 'festival harness outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
      { ...baseMetric, keyword: 'harness outfit festival', keyword_norm: 'harness outfit festival', bank_bucket: 'product_or_alt', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'leather harness top', keyword_norm: 'leather harness top', bank_bucket: 'product', avg_monthly_searches: 260 },
      { ...baseMetric, keyword: 'leather top harness', keyword_norm: 'leather top harness', bank_bucket: 'product_or_alt', avg_monthly_searches: 210 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('festival harness outfit'), true);
  assert.equal(keywords.includes('harness outfit festival'), false);
  assert.equal(keywords.includes('leather harness top'), true);
  assert.equal(keywords.includes('leather top harness'), false);
  assert.equal(result.diagnostics.semantic_duplicates_removed, 2);
});

test('manual component focus cannot manufacture missing Product Truth', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Accessory',
      canonical_color_label: 'Gold',
      included_components: [],
      parent_components_json: [],
      child_components_json: [],
    },
    focus: {
      component: ['harness'],
      event: ['festival'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold harness', keyword_norm: 'gold harness', bank_bucket: 'product', avg_monthly_searches: 5000 },
      { ...baseMetric, keyword: 'gold festival outfit', keyword_norm: 'gold festival outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.equal(keywords.includes('gold harness'), false);
  assert.equal(keywords.includes('gold festival outfit'), true);
  assert.deepEqual(result.diagnostics.product_component_families, []);
});

test('versioned SEO axes retrieve a harness page entity without rewriting sellable components', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: "Brutal Leather Harness Set Choker Top Harness Leg Garter, Men's Chest Harness",
      source_category_label: 'Harness / Accessory',
      canonical_color_label: 'Black',
      material: 'Leather',
      sellable_offer_components: ['Leg Covers', 'Choker'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Leg Covers', 'Choker'],
      },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'harness', 'legs', 'choker'],
      sellable_component_axes: ['legs', 'choker'],
      search_only_component_axes: ['top', 'harness'],
      material: ['black', 'leather'],
      event: ['festival', 'pride'],
      style: ['punk'],
      audience: ['men'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: "men's chest harness", keyword_norm: "men's chest harness", bank_bucket: 'product', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'leather harness top', keyword_norm: 'leather harness top', bank_bucket: 'product_or_alt', avg_monthly_searches: 70 },
      { ...baseMetric, keyword: 'black festival top', keyword_norm: 'black festival top', bank_bucket: 'product', avg_monthly_searches: 100000 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    "men's chest harness",
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'leather harness top')?.role,
    'secondary',
  );
  assert.equal(result.keywords.some((row) => row.keyword_norm === 'black festival top'), false);
  assert.deepEqual(result.diagnostics.product_component_families, ['choker', 'legs']);
  assert.deepEqual(result.diagnostics.product_primary_entity_families, ['harness']);
  assert.deepEqual(result.diagnostics.operator_search_axis_families, ['choker', 'harness', 'legs', 'top']);
  assert.deepEqual(result.diagnostics.operator_search_only_axis_families, ['harness', 'top']);
});

test('a sellable body-placement axis cannot narrow a harness Primary to one area', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: "Brutal Leather Harness Set Choker Top Harness Leg Garter, Men's Chest Harness",
      source_category_label: 'Harness / Accessory',
      canonical_color_label: 'Black',
      material: 'Leather',
      sellable_offer_components: ['Top', 'Leg Covers', 'Choker'],
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'harness', 'legs', 'choker'],
      sellable_component_axes: ['top', 'legs', 'choker'],
      search_only_component_axes: ['harness'],
      material: ['black', 'leather'],
      event: ['festival', 'pride'],
      style: ['punk'],
      audience: ['men'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'leather harness top', keyword_norm: 'leather harness top', bank_bucket: 'product_or_alt', avg_monthly_searches: 260 },
      { ...baseMetric, keyword: 'black leather harness fashion', keyword_norm: 'black leather harness fashion', bank_bucket: 'product_or_alt', avg_monthly_searches: 10 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'black leather harness fashion',
  );
  assert.equal(
    result.keywords.find((row) => row.keyword_norm === 'leather harness top')?.role,
    'secondary',
  );
});

test('a visual shoulder search axis cannot replace a crown as the Primary entity', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Black Leather Crown Headpiece, Dark Witch Halloween Halo',
      source_category_label: 'Headpiece / Accessory',
      canonical_color_label: 'Black',
      material: 'Leather',
      sellable_offer_components: ['Bodysuit', 'Leg Covers', 'Headpiece'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Bodysuit', 'Leg Covers', 'Headpiece'],
      },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'bodysuit', 'legs', 'headpiece'],
      sellable_component_axes: ['bodysuit', 'legs', 'headpiece'],
      search_only_component_axes: ['shoulders'],
      material: ['black', 'leather'],
      event: ['halloween', 'cosplay'],
      style: ['goth', 'fantasy'],
      persona: ['queen'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'black leather crown', keyword_norm: 'black leather crown', bank_bucket: 'product', avg_monthly_searches: 70 },
      { ...baseMetric, keyword: 'black shoulder costume', keyword_norm: 'black shoulder costume', bank_bucket: 'product', avg_monthly_searches: 100000 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'black leather crown',
  );
  assert.equal(result.keywords.some((row) => row.keyword_norm === 'black shoulder costume'), false);
  assert.ok(result.diagnostics.product_primary_entity_families.includes('crown'));
});

test('a dress-like top and skirt can use dress only as an indirect discovery alias', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Carnival Dress with Leather Feathers – Crown Headpiece, Top & Skirt, Showgirl Outfit',
      source_category_label: 'Headpiece / Accessory',
      material: 'Leather',
      sellable_offer_components: ['Top', 'Skirt', 'Headpiece'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Top', 'Skirt', 'Headpiece'],
      },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'skirt', 'headpiece'],
      sellable_component_axes: ['top', 'skirt', 'headpiece'],
      search_only_component_axes: [],
      style: ['glam', 'burlesque'],
      persona: ['performer', 'showgirl'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'carnival dress', keyword_norm: 'carnival dress', bank_bucket: 'product', avg_monthly_searches: 5000 },
      { ...baseMetric, keyword: 'carnival showgirl outfit', keyword_norm: 'carnival showgirl outfit', bank_bucket: 'product', avg_monthly_searches: 70 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'carnival showgirl outfit',
  );
  const dressAlias = result.keywords.find((row) => row.keyword_norm === 'carnival dress');
  assert.equal(dressAlias?.role, 'supporting');
  assert.equal(dressAlias?.discovery_alias_only, true);
  assert.deepEqual(result.diagnostics.indirect_discovery_alias_families, ['dress']);
});

test('an operator-confirmed red color retrieves red keywords when imported color is empty', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Carnival Showgirl Outfit with Crown Headpiece, Top and Skirt',
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Top', 'Skirt', 'Headpiece'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Top', 'Skirt', 'Headpiece'],
      },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'skirt', 'headpiece'],
      sellable_component_axes: ['top', 'skirt', 'headpiece'],
      search_only_component_axes: [],
      material: ['red', 'leather'],
      persona: ['showgirl'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'red carnival showgirl outfit', keyword_norm: 'red carnival showgirl outfit', bank_bucket: 'product', avg_monthly_searches: 90 },
    ],
  });

  assert.equal(result.keywords[0]?.keyword_norm, 'red carnival showgirl outfit');
  assert.deepEqual(result.diagnostics.product_colors, ['red']);
});

test('non-apparel harness domains are rejected before metrics can rank them', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Gold Festival Harness Top',
      canonical_color_label: 'Gold',
      included_components: ['Harness', 'Top'],
    },
    focus: {
      component: ['harness', 'top'],
      event: ['festival'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'nelson performance harness', keyword_norm: 'nelson performance harness', bank_bucket: 'product', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'tweak d performance 2jz harness', keyword_norm: 'tweak d performance 2jz harness', bank_bucket: 'product', avg_monthly_searches: 90000 },
      { ...baseMetric, keyword: 'flying harness for stage', keyword_norm: 'flying harness for stage', bank_bucket: 'product', avg_monthly_searches: 80000 },
      { ...baseMetric, keyword: 'rope body harness', keyword_norm: 'rope body harness', bank_bucket: 'product', avg_monthly_searches: 70000 },
      { ...baseMetric, keyword: 'gold festival harness outfit', keyword_norm: 'gold festival harness outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
    ],
  });

  const keywords = result.keywords.map((row) => String(row.keyword_norm));
  assert.deepEqual(keywords, ['gold festival harness outfit']);
});

test('multiple selected strategy modes resolve to balanced scoring', () => {
  assert.equal(normalizeStrategy('demand,opportunity,niche'), 'balanced');
  assert.equal(normalizeStrategy(['demand', 'niche']), 'balanced');
  assert.equal(normalizeStrategy('demand'), 'demand');
});
