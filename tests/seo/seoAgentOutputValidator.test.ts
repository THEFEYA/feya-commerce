import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSeoAgentOutput } from '../../lib/seoAgentOutputValidator.ts';

function output(overrides: Record<string, unknown> = {}) {
  return {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Shoulder Armor for Burning Man',
    h1: 'Gold Shoulder Armor',
    meta_description: 'Gold shoulder armor with layered panels for Burning Man, stage costumes, and desert festival styling.',
    intro: 'Build a bold Burning Man look around this gold shoulder armor. Its layered design adds a distinctive armored detail for festival and stage styling.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Model wearing layered gold shoulder armor', truth_basis: 'visible_product_fact' }],
    internal_linking_hints: [],
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Build a bold Burning Man or stage look around this layered gold armor. Adjustable straps make the fit easier to adapt to different body shapes.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Our original studio design gives the outfit a bold, recognizable detail.\nThe chest strap supports a more secure fit.\nLayered material helps the piece keep its shape between wears.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Burning Man and desert festivals.\nStage costumes and editorial shoots.\nWarrior-inspired styling for men.', source_basis: 'product_fact', needs_human_review: false },
      { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we are an independent team of designers with a fresh point of view on festival and stage fashion. We create original ideas across different styles so people can choose a design that feels like them. This piece gives you a distinctive starting point for a bold performance look. You can build the rest around your own style.', source_basis: 'brand_policy', needs_human_review: false },
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

test('allows two evidenced Why benefits without demanding filler', () => {
  const value = output({
    pdp_blocks: output().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: 'Our original studio design is not tied to a named character.\nEach component can be ordered separately when you only need one part.',
      }
      : block),
  });
  const result = validateSeoAgentOutput(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('pdp_block_benefit_count_')), false);
});

test('blocks a padded H1 that restates the same shoulder product', () => {
  const result = validateSeoAgentOutput(output({ h1: 'Gold Shoulder Armor with a Sculptural Shoulder Piece' }));
  assert.ok(result.issues.some((issue) => issue.code === 'h1_restates_same_product_entity'));
});

test('blocks computer-vision audit language everywhere except ALT', () => {
  const value = output({
    meta_description: 'Gold shoulder armor with a sculptural profile of the left shoulder for Burning Man.',
    intro: 'Positioned high and clearly visible from the front, this creates a desert-ready look for buyers who want a statement shoulder piece.',
    pdp_blocks: output().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? { ...block, body: 'At TheFEYA, our small independent team creates original festival pieces. We design for self-expression. This shoulder line gives the upper body a bold shape.' }
      : block),
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Gold armor worn on the left shoulder, visible from the front', truth_basis: 'visible_product_fact' }],
  });

  const result = validateSeoAgentOutput(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.some((code) => code.endsWith('_alt_only_directional_detail')));
  assert.ok(codes.some((code) => code.endsWith('_anatomical_design_audit')));
  assert.ok(codes.some((code) => code.endsWith('_unnatural_event_atmosphere')));
  assert.ok(codes.some((code) => code.endsWith('_brand_status_diminution')));
  assert.ok(codes.some((code) => code.endsWith('_product_component_as_buyer_goal')));
  assert.equal(codes.some((code) => code.includes('image_alt_candidates_0_alt_text_alt_only_directional_detail')), false);
});
