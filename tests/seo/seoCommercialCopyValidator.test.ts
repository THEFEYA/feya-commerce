import assert from 'node:assert/strict';
import test from 'node:test';
// @ts-expect-error Node's strip-types runner requires the explicit TypeScript extension.
import { validateSeoCommercialCopy } from '../../lib/seoCommercialCopyValidator.ts';

function draft(overrides: Record<string, unknown> = {}) {
  return {
    seo_title: 'Cyberpunk Shoulder Armor for Festival Performance',
    h1: 'Cyberpunk Shoulder Armor with Sculptural Profile',
    meta_description: 'Sculptural shoulder armor for festival and stage styling, with a defined profile and adjustable fit for performance looks.',
    intro: 'This shoulder armor creates a defined upper-body profile. Its layered shape gives performance styling a strong focal line.',
    bullet_highlights: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Model wearing layered shoulder armor', truth_basis: 'visible_product_fact' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Layered panels frame the shoulder and keep the profile visually defined.' },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Adjustable straps support the fit.\nLayered construction holds a defined shape.\nThe silhouette reads clearly on stage.' },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Festival styling\nStage performance\nEditorial wardrobe' },
      { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we use deliberate lines and layered forms to help you build a personal performance look with a recognizable profile.' },
    ],
    ...overrides,
  };
}

test('blocks robotic, social-metric, and redundant material copy', () => {
  const value = draft({
    intro: 'Studio-created from an original in-house concept with a body-friendly feel. Vegan leather and faux leather support organic attention, reactions, saves and comments.',
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_robotic_or_tautological_value'));
  assert.ok(codes.includes('customer_copy_contains_social_metrics_boilerplate'));
  assert.ok(codes.includes('customer_copy_stacks_vegan_and_faux_leather_synonyms'));
});

test('blocks reflective claims when Product Truth does not confirm reflection', () => {
  const value = draft({ intro: 'This shoulder armor has a reflective finish that catches stage light. Its layered shape gives the upper body a defined profile.' });
  const result = validateSeoCommercialCopy(value, { product_truth: { material: 'Leather, Faux leather', canonical_color_label: 'Gold' } });
  assert.ok(result.issues.some((issue) => issue.code === 'unsupported_reflective_finish_claim'));
});

test('allows reflective wording only when explicit Product Truth supports it', () => {
  const value = draft({ intro: 'This shoulder armor uses a reflective material for stage visibility. Its layered shape gives the upper body a defined profile.' });
  const result = validateSeoCommercialCopy(value, { product_truth: { material: 'Retroreflective textile' } });
  assert.equal(result.issues.some((issue) => issue.code === 'unsupported_reflective_finish_claim'), false);
});

test('blocks one repeated idea spread across three customer blocks', () => {
  const value = draft({
    intro: 'The sculptural silhouette defines the upper body. Its layered shape supports performance styling.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => (
      ['about_this_piece', 'why_youll_love_it'].includes(block.block_key)
        ? { ...block, body: `${block.body}\nThe sculptural silhouette keeps a defined shape.` }
        : block
    )),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'repeated_idea_silhouette_shape' && issue.severity === 'blocker'));
});
