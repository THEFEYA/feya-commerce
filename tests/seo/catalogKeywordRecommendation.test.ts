import assert from 'node:assert/strict';
import test from 'node:test';
import { recommendCatalogKeywords } from '../../lib/seoCatalogKeywordRecommendation.ts';

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

  assert.ok(result.keywords.length >= 3);
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
      { ...baseMetric, keyword: 'gold festival armor outfit', keyword_norm: 'gold festival armor outfit', bank_bucket: 'product', avg_monthly_searches: 120 },
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
