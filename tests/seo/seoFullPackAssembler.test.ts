import assert from 'node:assert/strict';
import test from 'node:test';
import { assembleSeoProductPack } from '../../lib/seoFullPackAssembler.ts';

test('assembles non-model SEO fields and keeps publish blocked', () => {
  const validation = { ok: true, status: 'valid', issues: [] };
  const placement = { ...validation, placements: [], used_keywords: [], unplaced_keywords: [] };
  const pack = assembleSeoProductPack({
    draft: {
      canonical_product_id: 'product-1',
      product_truth: {
        canonical_product_id: 'product-1',
        title: 'Gold Armor Set',
        slug: 'very-long-legacy-product-slug-123',
        primary_image_url: 'https://example.com/product.jpg',
        material: 'EVA foam',
        color: 'Gold',
        known_components: ['Shoulders'],
        known_non_components: [],
      },
      keyword_roles: {
        primary: [{ keyword: 'gold armor set', keyword_norm: 'gold armor set', role: 'primary' }],
        secondary: [], support: [], image_alt: [], collection: [], faq_commercial: [], hold: [], reject: [],
      },
    } as never,
    output: {
      seo_title: 'Gold Armor Set for Futuristic Festival Styling',
      h1: 'Gold Armor Set with Sculptural Shoulder Pieces',
      meta_description: 'Gold armor set for futuristic festival, stage and editorial styling with a strong sculptural profile designed for camera visibility.',
      intro: 'A sculptural gold armor set for stage and festival styling.',
      pdp_blocks: [{ block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'Studio close.', source_basis: 'brand_policy' }],
      faq: [],
      image_alt_candidates: [{ image_role: 'primary', alt_text: 'Model wearing reflective gold armor pieces', truth_basis: 'visible_product_fact' }],
      internal_linking_hints: [],
    } as never,
    structuralValidation: validation,
    commercialValidation: validation,
    keywordPlacementValidation: placement as never,
  });

  assert.equal(pack.url.proposed_slug, 'gold-armor-set');
  assert.equal(pack.image_seo[0].proposed_filename, 'gold-armor-set-primary-01.webp');
  assert.equal(pack.structured_data.product['@type'], 'Product');
  assert.equal(pack.quality_gate.ready_for_storage, true);
  assert.equal(pack.quality_gate.ready_for_publish, false);
  assert.equal(pack.apply.status, 'blocked_until_approval');
});
