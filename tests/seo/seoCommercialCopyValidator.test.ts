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

test('blocks a redundant shoulder entity in H1 and meta description', () => {
  const value = draft({
    h1: 'Gold Shoulder Armor with a Sculptural Shoulder Piece',
    meta_description: 'Gold shoulder armor with a sculptural shoulder piece for Burning Man, desert wear, and warrior styling.',
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('h1_restates_same_product_entity'));
  assert.ok(codes.includes('meta_description_restates_same_product_entity'));
});

test('blocks the current pilot robotic phrases and broken studio grammar', () => {
  const value = draft({
    intro: 'It is a strong choice when you want a defined, intentional look that reads fast in open light.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'The shoulder-led design gives you a distinctive studio-made alternative to a generic costume look.',
            'The chest strap helps the piece sit more securely, so it is easier to wear with confidence.',
            'The sculptural build keeps the shape visually strong, which helps the piece hold its presence in photos and movement.',
            'The gold finish gives the design a deliberate, high-impact character that feels more considered than mass-market costume styling.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return { ...block, body: 'TheFEYA we design for people who want a bold detail to carry the whole look and express their own visual identity.' };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_robotic_or_tautological_value'));
  assert.ok(codes.some((code) => (
    code.includes('has_feature_but_no_buyer_outcome') || code.includes('has_no_concrete_buyer_value')
  )));
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

test('blocks the visual-audit and use-case bullets from the pilot draft', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Distinct asymmetrical silhouette that gives the look a harder, more dramatic line',
          'Gold and dark metallic surfaces add contrast and visual depth',
          'Structured build supports a firm armored presence',
          'Works for warrior, futuristic, and desert-inspired styling',
          'Studio-made character gives it a more individual feel than mass-produced costume pieces',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('why_youll_love_it_wrong_benefit_count'));
  assert.ok(codes.some((code) => code.includes('is_abstract_visual_commentary')));
  assert.ok(codes.some((code) => code.includes('belongs_in_ideal_for')));
});

test('accepts a concise feature-to-buyer-outcome benefit mix', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Designed in our studio as a distinctive alternative to a generic mass-produced costume look.',
          'Adjustable straps make it quick to put on and easy to fine-tune over different base layers.',
          'The soft body-facing material feels comfortable against the body during wear.',
          'Structured material helps the piece hold its shape between wears.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
});
