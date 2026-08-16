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

test('a component-led set query cannot pass Listing Master when another sellable piece is unresolved', () => {
  const result = recommendCatalogKeywords({
    product: {
      card_title: 'Golden Festival Outfit with Bra & Skirt, Gold Harness Set',
      source_category_label: 'Harness / Accessory',
      sellable_offer_components: ['Option', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Option', 'Skirt'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['bra', 'top', 'harness', 'skirt'],
      sellable_component_axes: ['skirt'],
      search_only_component_axes: ['bra', 'top', 'harness'],
      material: ['gold', 'leather'],
      event: ['festival'],
      style: ['glam'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'gold skirt set', keyword_norm: 'gold skirt set', bank_bucket: 'product_or_alt', avg_monthly_searches: 320 },
      { ...baseMetric, keyword: 'festival skirt set', keyword_norm: 'festival skirt set', bank_bucket: 'product', avg_monthly_searches: 110 },
    ],
  });

  assert.equal(result.keywords.find((row) => row.role === 'primary'), undefined);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'gold skirt set')?.whole_product_intent, false);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'festival skirt set')?.whole_product_intent, false);
  assert.equal(result.diagnostics.keyword_selection_status, 'needs_primary_review');
  assert.equal(result.diagnostics.auto_primary_scope, 'blocked_no_whole_product_candidate');
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
      category_label: 'Fashion tops & corsets',
      product_type: 'top',
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
  assert.deepEqual(result.diagnostics.product_primary_entity_families, ['harness']);
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
      { ...baseMetric, keyword: 'halloween costume with black bodysuit', keyword_norm: 'halloween costume with black bodysuit', bank_bucket: 'product_or_alt', avg_monthly_searches: 100000 },
      { ...baseMetric, keyword: 'black shoulder costume', keyword_norm: 'black shoulder costume', bank_bucket: 'product', avg_monthly_searches: 100000 },
    ],
  });

  assert.equal(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'black leather crown',
  );
  assert.notEqual(
    result.keywords.find((row) => row.role === 'primary')?.keyword_norm,
    'halloween costume with black bodysuit',
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

test('rare brown and classic axes remain optional but retrieve a matching harness query', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'de38a842-37c4-40a7-86b4-393341c4c9aa',
      card_title: 'Deluxe Leather Harness for Men',
      source_category_label: 'Harnesses',
      sellable_offer_components: ['Harness Top'],
      sellable_offer: { status: 'ready', component_labels: ['Harness Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'harness'],
      sellable_component_axes: ['harness'],
      search_only_component_axes: ['top'],
      material: ['brown', 'leather'],
      event: ['photoshoot'],
      style: ['classic'],
      audience: ['men'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'classic brown leather harness', keyword_norm: 'classic brown leather harness', bank_bucket: 'product', avg_monthly_searches: 40 },
    ],
  });

  assert.equal(result.keywords[0]?.keyword_norm, 'classic brown leather harness');
  assert.deepEqual(result.diagnostics.product_colors, ['brown']);
  assert.deepEqual(result.diagnostics.product_styles, ['classic']);
});

test('owner-reviewed red outfit fallback promotes only the exact validated whole-product query', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'f473fb62-0440-473c-a7fb-a52dccafebc6',
      card_title: 'Red Burlesque Dress with Spine-Tail',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Top', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Top', 'Skirt'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['top', 'skirt', 'spine', 'tail'],
      sellable_component_axes: ['top', 'skirt'],
      search_only_component_axes: ['spine', 'tail'],
      material: ['red'],
      event: ['stage', 'drag'],
      style: ['glam', 'burlesque'],
      persona: ['drag queen', 'performer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'red stage outfit', keyword_norm: 'red stage outfit', bank_bucket: 'collection', avg_monthly_searches: 40 },
      { ...baseMetric, keyword: 'stage performance outfit', keyword_norm: 'stage performance outfit', bank_bucket: 'collection', avg_monthly_searches: 70 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'red stage outfit');
  assert.equal(primary?.whole_product_intent, true);
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'stage performance outfit')?.role, 'supporting');
});

test('owner-reviewed dance fallback keeps the complete costume as Primary', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'ffa74da5-c2e1-4c3a-b460-50d1aae09f56',
      card_title: 'Exclusive Dance Costume Set with Bodysuit and Leg Covers',
      source_category_label: 'Bodysuit',
      sellable_offer_components: ['Bodysuit', 'Leg Covers'],
      sellable_offer: { status: 'ready', component_labels: ['Bodysuit', 'Leg Covers'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['bodysuit', 'legs'],
      sellable_component_axes: ['bodysuit', 'legs'],
      search_only_component_axes: [],
      material: ['black', 'gold', 'fabric'],
      event: ['stage'],
      style: ['futuristic', 'glam'],
      persona: ['dancer', 'performer', 'showgirl', 'go go dancer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'bodysuit dance costume', keyword_norm: 'bodysuit dance costume', bank_bucket: 'product', avg_monthly_searches: 110 },
      { ...baseMetric, keyword: 'dance costume for ladies', keyword_norm: 'dance costume for ladies', bank_bucket: 'collection', avg_monthly_searches: 590 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'dance costume for ladies');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'bodysuit dance costume')?.role, 'secondary');
});

test('owner-reviewed white rave fallback uses the measured whole-costume query for the configurable set', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '7e743440-3e9f-490c-b306-5c8c87969973',
      card_title: "Women's White Festival Outfit for Rave Party",
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Arms', 'Shoulders', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Shoulders', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'skirt', 'arms'],
      sellable_component_axes: ['shoulders', 'skirt', 'arms'],
      search_only_component_axes: [],
      material: ['white', 'vegan leather'],
      event: ['festival', 'rave'],
      style: ['futuristic'],
      persona: [],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', bank_bucket: 'product', avg_monthly_searches: 30 },
      { ...baseMetric, keyword: 'white rave costume', keyword_norm: 'white rave costume', bank_bucket: 'visual_collection', avg_monthly_searches: 1000 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'white rave costume');
  assert.equal(primary?.whole_product_intent, true);
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'rave outfit with skirt')?.role, 'secondary');
});

test('owner-reviewed witch fallback avoids the occupied Halloween Primary', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '2a39f8ec-b5c3-403c-8f1a-7e10bb0ab829',
      card_title: 'Dark Witch Exclusive Halloween Costume',
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Bodysuit', 'Leg Covers', 'Headpiece'],
      sellable_offer: { status: 'ready', component_labels: ['Bodysuit', 'Leg Covers', 'Headpiece'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['bodysuit', 'legs', 'headpiece'],
      sellable_component_axes: ['bodysuit', 'legs', 'headpiece'],
      search_only_component_axes: [],
      material: ['black', 'vegan leather'],
      event: ['halloween', 'cosplay'],
      style: ['glam', 'fantasy'],
      persona: ['queen', 'witch'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'halloween costume with black bodysuit', keyword_norm: 'halloween costume with black bodysuit', bank_bucket: 'product', avg_monthly_searches: 210 },
      { ...baseMetric, keyword: 'black bodysuit halloween costume', keyword_norm: 'black bodysuit halloween costume', bank_bucket: 'product', avg_monthly_searches: 210 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'black bodysuit halloween costume');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'halloween costume with black bodysuit')?.role, 'secondary');
});

test('owner-reviewed configurable witch set promotes the measured costume query above its legacy headpiece category', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '50c370fb-3f41-4e49-8e3b-cbc5e1dd478b',
      card_title: 'Black Leather Crown Headpiece, Dark Witch Halloween Halo',
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
      sellable_offer: { status: 'ready', component_labels: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'bodysuit', 'legs', 'headpiece'],
      sellable_component_axes: ['bodysuit', 'legs', 'headpiece'],
      search_only_component_axes: ['shoulders'],
      material: ['black', 'leather'],
      event: ['halloween', 'cosplay'],
      style: ['glam', 'goth', 'fantasy'],
      persona: ['queen', 'witch'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'halloween headpiece', keyword_norm: 'halloween headpiece', bank_bucket: 'product', avg_monthly_searches: 170 },
      { ...baseMetric, keyword: 'bodysuit halloween costume', keyword_norm: 'bodysuit halloween costume', bank_bucket: 'product', avg_monthly_searches: 480 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'bodysuit halloween costume');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'halloween headpiece')?.role, 'secondary');
});

test('owner-reviewed black rave products can own validated whole-product visual phrases', () => {
  const approvedKeywords = [
    { ...baseMetric, keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', bank_bucket: 'product', avg_monthly_searches: 30 },
    { ...baseMetric, keyword: 'black leather rave outfit', keyword_norm: 'black leather rave outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 30 },
    { ...baseMetric, keyword: 'black rave costume', keyword_norm: 'black rave costume', bank_bucket: 'visual_collection', avg_monthly_searches: 1600 },
  ];
  const focus = {
    component_focus_contract: 'seo_search_axes_v1',
    component: ['skirt', 'arms'],
    sellable_component_axes: ['skirt', 'arms'],
    search_only_component_axes: [],
    material: ['black', 'vegan leather'],
    event: ['rave', 'festival'],
    style: ['punk'],
    audience: ['women'],
  };

  const shoulderSet = recommendCatalogKeywords({
    product: {
      canonical_product_id: '5044435f-d093-4437-9945-ff822b2df2d9',
      card_title: 'Black Rave Outfit, Festival Leather Shoulders',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Arms', 'Panties', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Panties', 'Skirt'] },
    },
    focus,
    approvedKeywords,
  });
  assert.equal(shoulderSet.keywords.find((row) => row.role === 'primary')?.keyword_norm, 'black leather rave outfit');
  assert.equal(shoulderSet.keywords.find((row) => row.role === 'primary')?.owner_reviewed_pdp_primary, true);

  const chainSet = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'b6fe4fd9-400d-4fc4-a6e1-2e1dee936371',
      card_title: 'Black Rave Wear Set: Collar Skirt Top, Punk Chain',
      source_category_label: 'Harness / Accessory',
      sellable_offer_components: ['Skirt', 'Top', 'Choker'],
      sellable_offer: { status: 'ready', component_labels: ['Skirt', 'Top', 'Choker'] },
    },
    focus,
    approvedKeywords,
  });
  assert.equal(chainSet.keywords.find((row) => row.role === 'primary')?.keyword_norm, 'black rave costume');
  assert.equal(chainSet.keywords.find((row) => row.role === 'primary')?.owner_reviewed_pdp_primary, true);
});

test('owner-reviewed silver multi-piece outfit keeps its color intent without reusing a skirt Primary', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '4b0c8180-774d-4d5c-a12c-0864f305d1cb',
      card_title: "Burning Man Silver Outfit – Cyber Warrior Men's Costume",
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Arms', 'Shoulders', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Shoulders', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['arms', 'shoulders', 'skirt', 'top'],
      sellable_component_axes: ['arms', 'shoulders', 'skirt', 'top'],
      search_only_component_axes: [],
      material: ['silver', 'metallic'],
      event: ['burning man', 'rave'],
      style: ['futuristic', 'cyberpunk'],
      persona: ['warrior'],
      audience: ['men'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', bank_bucket: 'product', avg_monthly_searches: 30 },
      { ...baseMetric, keyword: 'silver metallic outfit', keyword_norm: 'silver metallic outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 140 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'silver metallic outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'rave outfit with skirt')?.role, 'secondary');
});

test('owner-reviewed silver cyber set uses its free whole-outfit intent instead of occupied armor or skirt Primaries', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '3c08ea9c-76a9-4079-bc08-58fa8a831019',
      card_title: 'Best Futuristic Costume Set - Metallic Rave Wear, Silver Cyber Armor',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Arms', 'Choker', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Choker', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['arms', 'choker', 'skirt', 'top'],
      sellable_component_axes: ['arms', 'choker', 'skirt', 'top'],
      search_only_component_axes: [],
      material: ['silver', 'mirror'],
      event: ['rave', 'edm'],
      style: ['futuristic', 'cyberpunk'],
      persona: ['robot'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'rave skirt and top set', keyword_norm: 'rave skirt and top set', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'futuristic armor costume', keyword_norm: 'futuristic armor costume', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'robot armor costume', keyword_norm: 'robot armor costume', bank_bucket: 'product', avg_monthly_searches: 20 },
      { ...baseMetric, keyword: 'silver rave outfit', keyword_norm: 'silver rave outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 260 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'silver rave outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'rave skirt and top set')?.role, 'secondary');
});

test('owner-reviewed silver Burning Man set uses a measured whole-outfit Primary instead of a harness component phrase', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'ce899f23-b983-4ede-ae81-3348757b1c15',
      card_title: 'Burning Man Costume Set with Shoulder, Top Harness, Bracelet and Garters',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Shoulders', 'Top Harness', 'Bracelet', 'Garters'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Shoulders', 'Top Harness', 'Bracelet', 'Garters'],
      },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'harness', 'arms', 'legs'],
      sellable_component_axes: ['shoulders', 'harness', 'arms', 'legs'],
      search_only_component_axes: [],
      material: ['silver', 'mirror', 'vegan leather', 'metallic'],
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'cyberpunk', 'desert'],
      persona: ['warrior'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'silver body harness', keyword_norm: 'silver body harness', bank_bucket: 'product', avg_monthly_searches: 20 },
      { ...baseMetric, keyword: 'harness festival outfit', keyword_norm: 'harness festival outfit', bank_bucket: 'product', avg_monthly_searches: 20, competition: 'LOW', competition_index: 19 },
      { ...baseMetric, keyword: 'harness outfit festival', keyword_norm: 'harness outfit festival', bank_bucket: 'product', avg_monthly_searches: 10, competition: 'LOW', competition_index: 0 },
      { ...baseMetric, keyword: 'burning man harness', keyword_norm: 'burning man harness', bank_bucket: 'product', avg_monthly_searches: 40 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'harness festival outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(primary?.avg_monthly_searches, 20);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'silver body harness')?.role, 'secondary');
  assert.equal(result.keywords.some((row) => row.keyword_norm === 'harness outfit festival'), false);
});

test('owner-reviewed carnival set uses a validated whole-stage phrase instead of a headpiece-only Primary', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '7bc4e89c-155d-45b8-982f-46253b7ed18d',
      card_title: 'Carnival Dress with Leather Feathers - Crown Headpiece, Top & Skirt',
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Headpiece', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Headpiece', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['headpiece', 'skirt', 'top'],
      sellable_component_axes: ['headpiece', 'skirt', 'top'],
      search_only_component_axes: [],
      material: ['fabric', 'vegan leather'],
      event: ['stage', 'photoshoot'],
      style: ['glam', 'burlesque'],
      persona: ['showgirl', 'performer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'showgirl feather headpiece', keyword_norm: 'showgirl feather headpiece', bank_bucket: 'product', avg_monthly_searches: 210 },
      { ...baseMetric, keyword: 'stage performance outfit', keyword_norm: 'stage performance outfit', bank_bucket: 'collection', avg_monthly_searches: 70 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'stage performance outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.notEqual(primary?.keyword_norm, 'showgirl feather headpiece');
});

test('owner-reviewed silver carnival set owns its validated dress-costume variation', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'd0625355-308f-4edd-9c28-e358491c12a3',
      card_title: "Carnival Dress with Mask Top Skirt Bracelets, Women's Costume for Show",
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Arms', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['arms', 'skirt', 'top', 'mask', 'headpiece'],
      sellable_component_axes: ['arms', 'skirt', 'top'],
      search_only_component_axes: ['mask', 'headpiece'],
      material: ['silver', 'mirror', 'metallic'],
      event: ['festival', 'stage', 'photoshoot'],
      style: ['futuristic', 'glam', 'burlesque'],
      persona: ['showgirl', 'dancer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'metallic top and skirt set', keyword_norm: 'metallic top and skirt set', bank_bucket: 'product_or_alt', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'skirt and top set festival', keyword_norm: 'skirt and top set festival', bank_bucket: 'product', avg_monthly_searches: 10 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'skirt and top set festival');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'metallic top and skirt set')?.role, 'secondary');
});

test('owner-reviewed gold fringe set owns Burning Man color intent instead of a reused rave set Primary', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '60ee8feb-32d3-4a8c-b64b-38d33433e2f2',
      card_title: 'Chic Festival Costume Set for Burning Man - Golden Harness Top & Fringe Skirt',
      source_category_label: 'Harness / Accessory',
      sellable_offer_components: ['Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['harness', 'skirt', 'top'],
      sellable_component_axes: ['skirt', 'top'],
      search_only_component_axes: ['harness'],
      material: ['gold', 'mirror', 'metallic'],
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'desert'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'rave skirt and top set', keyword_norm: 'rave skirt and top set', bank_bucket: 'product', avg_monthly_searches: 10 },
      { ...baseMetric, keyword: 'gold burning man outfit', keyword_norm: 'gold burning man outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 10 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'gold burning man outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'rave skirt and top set')?.role, 'secondary');
});

test('owner-reviewed chrome festival set uses its validated full-outfit phrase', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'f86a13ec-184e-4764-9813-33b18db7dbb3',
      card_title: 'Chrome Festival Outfit: Metallic Top & Skirt, Silver Armor Set',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Choker', 'Shoulders', 'Top', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Choker', 'Shoulders', 'Top', 'Skirt'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['bra', 'choker', 'shoulders', 'top', 'skirt', 'legs'],
      sellable_component_axes: ['choker', 'shoulders', 'top', 'skirt'],
      search_only_component_axes: ['bra', 'legs'],
      material: ['silver', 'mirror', 'metallic'],
      event: ['festival', 'rave', 'burning man'],
      style: ['futuristic', 'cyberpunk', 'cosmic'],
      persona: ['alien'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'silver collar choker', keyword_norm: 'silver collar choker', bank_bucket: 'product_or_alt', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'silver festival outfit', keyword_norm: 'silver festival outfit', bank_bucket: 'visual_collection', avg_monthly_searches: 70 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'silver festival outfit');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'silver collar choker')?.role, 'secondary');
});

test('owner-reviewed chrome showgirl set promotes its validated full dress-costume phrase', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: '103ff46a-892a-4961-80b1-e6996727c395',
      card_title: 'Chrome Futuristic Clothing Set - Silver Festival Dress, Showgirl Wear',
      source_category_label: 'Costume Set',
      source_description_fragment: 'Silver festival dress set with choker, bracelets and panties.',
      sellable_offer_components: ['Arms', 'Choker', 'Panties', 'Skirt', 'Top'],
      sellable_offer: { status: 'ready', component_labels: ['Arms', 'Choker', 'Panties', 'Skirt', 'Top'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['arms', 'choker', 'panties', 'skirt', 'top'],
      sellable_component_axes: ['arms', 'choker', 'panties', 'skirt', 'top'],
      search_only_component_axes: [],
      material: ['silver', 'mirror', 'metallic'],
      event: ['festival', 'rave', 'stage'],
      style: ['futuristic', 'cosmic', 'glam'],
      persona: ['showgirl', 'dancer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'silver collar choker', keyword_norm: 'silver collar choker', bank_bucket: 'product_or_alt', avg_monthly_searches: 90 },
      { ...baseMetric, keyword: 'silver metallic dress costume', keyword_norm: 'silver metallic dress costume', bank_bucket: 'visual_collection', avg_monthly_searches: 20 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'silver metallic dress costume');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
});

test('owner-reviewed stage armor set keeps the full costume above one shoulder component', () => {
  const result = recommendCatalogKeywords({
    product: {
      canonical_product_id: 'f3d4bdd8-9ba0-400b-9cfc-e4a8097707fc',
      card_title: 'Chrome Stage Armor Lingerie Set - Burlesque Performance Outfit',
      source_category_label: 'Costume Set',
      sellable_offer_components: ['Shoulders', 'Top', 'Choker'],
      sellable_offer: { status: 'blocked', component_labels: ['Shoulders', 'Top', 'Choker'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'bra', 'top', 'choker'],
      sellable_component_axes: ['shoulders', 'top', 'choker'],
      search_only_component_axes: ['bra'],
      material: ['silver', 'mirror', 'acrylic', 'metallic'],
      event: ['stage', 'drag', 'photoshoot'],
      style: ['futuristic', 'glam', 'burlesque'],
      persona: ['drag queen', 'performer', 'showgirl'],
      audience: ['women', 'drag'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'futuristic shoulder armor', keyword_norm: 'futuristic shoulder armor', bank_bucket: 'product', avg_monthly_searches: 50 },
      { ...baseMetric, keyword: 'futuristic armor costume', keyword_norm: 'futuristic armor costume', bank_bucket: 'product', avg_monthly_searches: 10 },
    ],
  });

  const primary = result.keywords.find((row) => row.role === 'primary');
  assert.equal(primary?.keyword_norm, 'futuristic armor costume');
  assert.equal(primary?.owner_reviewed_pdp_primary, true);
  assert.equal(result.keywords.find((row) => row.keyword_norm === 'futuristic shoulder armor')?.role, 'secondary');
});

test('owner-reviewed cosmic products keep distinct measured PDP intents', () => {
  const crowdedWholeProductRows = [
    'silver metallic shoulder skirt outfit',
    'silver rave shoulder skirt outfit',
    'silver festival shoulder skirt outfit',
    'metallic rave shoulder skirt costume',
    'metallic festival shoulder skirt costume',
    'futuristic rave shoulder skirt outfit',
    'futuristic festival shoulder skirt costume',
    'cyberpunk rave shoulder skirt outfit',
    'cyberpunk festival shoulder skirt costume',
    'cosmic rave shoulder skirt outfit',
    'cosmic festival shoulder skirt costume',
  ].map((keyword, index) => ({
    ...baseMetric,
    keyword,
    keyword_norm: keyword,
    bank_bucket: 'product',
    score: 100 - index,
    avg_monthly_searches: 100_000 - index * 1_000,
    competition: 'LOW',
    competition_index: 0,
  }));
  const harnessAndSkirt = recommendCatalogKeywords({
    product: {
      canonical_product_id: '657bd6d8-fbe1-4441-abad-f574e3380897',
      card_title: 'Cosmic Festival Outfit with Top & Skirt, Metallic Harness Set, Rave Wear',
      source_category_label: 'Harness / Accessory',
      sellable_offer_components: ['Shoulders', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Shoulders', 'Skirt'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['shoulders', 'top', 'harness', 'skirt'],
      sellable_component_axes: ['shoulders', 'skirt'],
      search_only_component_axes: ['top', 'harness'],
      material: ['silver', 'mirror', 'vegan leather', 'metallic'],
      event: ['festival', 'rave', 'photoshoot'],
      style: ['futuristic', 'cyberpunk', 'cosmic'],
      persona: ['alien'],
      audience: ['women'],
    },
    approvedKeywords: [
      ...crowdedWholeProductRows,
      {
        ...baseMetric,
        keyword: 'rave harness outfit',
        keyword_norm: 'rave harness outfit',
        bank_bucket: 'product',
        avg_monthly_searches: 30,
        competition: 'MEDIUM',
        competition_index: 38,
      },
      { ...baseMetric, keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', bank_bucket: 'product', avg_monthly_searches: 30 },
      { ...baseMetric, keyword: 'metallic silver skirt outfit', keyword_norm: 'metallic silver skirt outfit', bank_bucket: 'product_or_alt', avg_monthly_searches: 70 },
    ],
  });
  assert.equal(harnessAndSkirt.keywords.find((row) => row.role === 'primary')?.keyword_norm, 'rave harness outfit');
  assert.equal(harnessAndSkirt.keywords.find((row) => row.keyword_norm === 'rave harness outfit')?.whole_product_intent, true);
  assert.equal(harnessAndSkirt.keywords.find((row) => row.keyword_norm === 'rave harness outfit')?.owner_reviewed_pdp_primary, true);
  assert.notEqual(harnessAndSkirt.keywords.find((row) => row.keyword_norm === 'metallic silver skirt outfit')?.role, 'primary');

  const cryptoWarrior = recommendCatalogKeywords({
    product: {
      canonical_product_id: '6739b15c-f2f3-4a26-9e2a-3a0b5a3e2d2f',
      card_title: 'Crypto Warrior Cosplay Costume Set - Headpiece Wings Bodysuit Bracelets Leg Covers, Futuristic Armor Outfit',
      source_category_label: 'Headpiece / Accessory',
      sellable_offer_components: ['Bodysuit', 'Arms', 'Legs', 'Headpiece', 'Wings'],
      sellable_offer: { status: 'ready', component_labels: ['Bodysuit', 'Arms', 'Legs', 'Headpiece', 'Wings'] },
    },
    focus: {
      component_focus_contract: 'seo_search_axes_v1',
      component: ['bodysuit', 'arms', 'legs', 'headpiece', 'wings'],
      sellable_component_axes: ['bodysuit', 'arms', 'legs', 'headpiece', 'wings'],
      search_only_component_axes: [],
      material: ['gold', 'black', 'fabric', 'vegan leather', 'metallic'],
      event: ['stage', 'halloween', 'cosplay', 'photoshoot'],
      style: ['futuristic', 'cyberpunk', 'sci fi', 'fantasy'],
      persona: ['warrior', 'performer'],
      audience: ['women'],
    },
    approvedKeywords: [
      { ...baseMetric, keyword: 'halloween costume with black bodysuit', keyword_norm: 'halloween costume with black bodysuit', bank_bucket: 'product_or_alt', avg_monthly_searches: 210 },
      { ...baseMetric, keyword: 'sci fi armor costume', keyword_norm: 'sci fi armor costume', bank_bucket: 'product', avg_monthly_searches: 10 },
    ],
  });
  assert.equal(cryptoWarrior.keywords.find((row) => row.role === 'primary')?.keyword_norm, 'sci fi armor costume');
});
