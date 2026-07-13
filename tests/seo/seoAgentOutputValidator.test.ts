import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { validateSeoAgentOutput } from '../../lib/seoAgentOutputValidator.ts';

function output(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Shoulder Armor for Burning Man',
    h1: 'Gold Shoulder Armor',
    meta_description: 'Gold shoulder armor with layered panels for Burning Man, stage costumes, and desert festival styling.',
    intro: 'This gold shoulder armor uses layered panels to frame the upper body. It is made for Burning Man and stage styling.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Model wearing layered gold shoulder armor', truth_basis: 'visible_product_fact' }],
    internal_linking_hints: [],
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Layered panels build a defined shape around one shoulder. The metallic gold surface is visible from the front, while the chest strap supports the piece across the upper body.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Our original studio design gives the outfit a bold, recognizable detail.\nThe chest strap supports a more secure fit.\nLayered material helps the piece keep its shape between wears.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Burning Man and desert festivals.\nStage costumes and editorial shoots.\nWarrior-inspired styling for men.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, our small independent team creates original pieces for people who express themselves through clothing. We design bold details that give a festival or stage outfit a recognizable identity. This piece brings that purpose into a product made for performance styling. It is made for moments when you want the outfit to stand out before you say a word.', source_basis: 'brand_policy', needs_human_review: false },
    ],
    visual_truth: {
      observed_product_facts: [],
      dna_matches: [],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'not_checked',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'pass',
      notes: [],
    },
    generation_notes: [],
    ...overrides,
  };
}

test('allows a concise complete H1 without character padding', () => {
  const result = validateSeoAgentOutput(output());
  const codes = result.issues.map((issue) => issue.code);
  assert.equal(codes.includes('h1_short'), false);
  assert.equal(codes.includes('h1_restates_same_product_entity'), false);
});

test('blocks a padded H1 that restates the same shoulder product', () => {
  const result = validateSeoAgentOutput(output({ h1: 'Gold Shoulder Armor with a Sculptural Shoulder Piece' }));
  assert.ok(result.issues.some((issue) => issue.code === 'h1_restates_same_product_entity'));
});
