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
