import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSeoCommercialCopy } from '../../lib/seoCommercialCopyValidator.ts';

function draft(overrides: Record<string, unknown> = {}) {
  return {
    seo_title: 'Cyberpunk Shoulder Armor for Festival Performance',
    h1: 'Cyberpunk Shoulder Armor for Stage Performance',
    meta_description: 'Cyberpunk shoulder armor for festival and stage looks, with an adjustable fit and layered gold finish.',
    intro: 'Build a bold festival or stage look around this cyberpunk shoulder armor. Its layered design gives the outfit a distinctive armored detail.',
    bullet_highlights: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Model wearing layered shoulder armor', truth_basis: 'visible_product_fact' }],
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Build a bold performance look around layered gold armor with adjustable straps for different body shapes.' },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Adjustable straps support the fit.\nLayered construction holds a defined shape.\nThe silhouette reads clearly on stage.' },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Festival styling\nStage performance\nEditorial wardrobe' },
      { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we are an independent team of designers with a fresh point of view on festival and stage fashion. We create original ideas across different styles so people can choose a design that feels like them. This piece gives you a distinctive starting point for a bold performance look. You can build the rest around your own style.' },
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

test('blocks directional image reporting and reversed buyer intent outside ALT', () => {
  const value = draft({
    meta_description: 'Gold shoulder armor with a sculptural profile of the left shoulder for Burning Man.',
    intro: 'The piece is positioned high and clearly visible from the front. It creates a desert-ready look for buyers who want a statement shoulder piece.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return { ...block, body: 'A sculptural overlay on the left shoulder creates an expressive upper-body form in desert light.' };
      }
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'Our original studio design is not a copy of a standard costume template.',
            'Adjustable straps make the piece quick to put on.',
            'Structured material helps it keep its shape between wears.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return { ...block, body: 'At TheFEYA, our small independent team creates original festival pieces. We design for self-expression. This shoulder line gives the upper body a bold shape.' };
      }
      return block;
    }),
  });

  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_alt_only_directional_detail'));
  assert.ok(codes.includes('customer_copy_uses_anatomical_geometry_as_value'));
  assert.ok(codes.includes('customer_copy_forces_event_into_unnatural_atmosphere'));
  assert.ok(codes.includes('customer_copy_minimizes_brand_status'));
  assert.ok(codes.includes('customer_copy_uses_invented_template_comparison'));
  assert.ok(codes.includes('customer_copy_reverses_buyer_goal_to_product_component'));
});

test('blocks the regenerated construction-heavy copy and abstract self-expression language', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'The layered shoulder construction offers an original alternative to a standard costume look.',
            'The strap-and-buckle construction makes the piece easier to secure and adjust on the body.',
            'Thanks to its strong construction, the piece keeps its shape during movement.',
            'Studio costume making gives it a more considered look than mass-produced pieces.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'The design of this model from TheFEYA turns the one-and-only shoulder line into an expressive accent. We create models that give your look clarity and individuality without excess visual noise.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_robotic_or_tautological_value'));
  assert.ok(codes.includes('why_youll_love_it_uses_nonsensical_shape_during_movement'));
  assert.ok(codes.includes('why_youll_love_it_repeats_construction_as_multiple_benefits'));
  assert.ok(codes.includes('self_expression_close_too_thin'));
  assert.ok(codes.includes('self_expression_close_wrong_sentence_count'));
});

test('requires an operator-selected event focus in H1', () => {
  const missing = validateSeoCommercialCopy(draft(), { manual_focus: { event: ['Burning Man'] } });
  assert.ok(missing.issues.some((issue) => issue.code === 'h1_missing_operator_event_focus'));

  const present = validateSeoCommercialCopy(draft({ h1: 'Gold Shoulder Armor for Burning Man' }), { manual_focus: { event: ['Burning Man'] } });
  assert.equal(present.issues.some((issue) => issue.code === 'h1_missing_operator_event_focus'), false);
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

test('blocks non-sold model styling in product image ALT', () => {
  const value = draft({
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Man in gold shoulder armor with a white cape, face mask and protective goggles in the desert',
      truth_basis: 'visible_product_fact',
    }],
  });
  const result = validateSeoCommercialCopy(value, {
    product_truth: { included_components: ['Shoulders'] },
  });
  assert.ok(result.issues.some((issue) => issue.code === 'image_alt_mentions_unsold_styling_item'));
});

test('allows a styled item in ALT when it is part of confirmed Product DNA', () => {
  const value = draft({
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold shoulder armor and face mask worn for a desert festival look',
      truth_basis: 'visible_product_fact',
    }],
  });
  const result = validateSeoCommercialCopy(value, {
    product_truth: { included_components: ['Shoulders', 'Face mask'] },
  });
  assert.equal(result.issues.some((issue) => issue.code === 'image_alt_mentions_unsold_styling_item'), false);
});

test('requires Ideal for to cover every selected focus axis without requiring every keyword variant', () => {
  const manualFocus = {
    event: ['Burning Man', 'festival'],
    style: ['cyberpunk'],
    persona: ['performer'],
    audience: ['women'],
  };
  const missing = validateSeoCommercialCopy(draft(), { manual_focus: manualFocus });
  const missingCodes = missing.issues.map((issue) => issue.code);
  // The default block already covers the selected event axis via "festival"
  // and the persona axis via "performance"; it must not repeat every synonym.
  assert.equal(missingCodes.includes('ideal_for_missing_operator_event_focus'), false);
  assert.ok(missingCodes.includes('ideal_for_missing_operator_style_focus'));
  assert.ok(missingCodes.includes('ideal_for_missing_operator_audience_focus'));

  const present = validateSeoCommercialCopy(draft({
    h1: 'Cyberpunk Shoulder Armor for Burning Man',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? { ...block, body: 'Women performers building a cyberpunk look for Burning Man\nFestival stage wardrobes' }
      : block),
  }), { manual_focus: manualFocus });
  assert.equal(present.issues.some((issue) => issue.code.startsWith('ideal_for_missing_operator_')), false);
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

test('does not treat distinct event and production use cases as one repeated visibility claim', () => {
  const value = draft({
    intro: 'Build a complete gold festival outfit for Burning Man performances.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return { ...block, body: 'The set combines shoulder armor, a harness top and a skirt for stage wear.' };
      }
      if (block.block_key === 'ideal_for') {
        return {
          ...block,
          body: [
            'Festival performers and dancers',
            'Editorial photoshoots and music-video costume work',
            'Burning Man and themed events',
          ].join('\n'),
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code === 'repeated_idea_stage_camera_visibility'), false);
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
          'Our original studio design gives you a distinctive piece for building a festival look that feels personal.',
          'Adjustable straps make it quick to put on and easy to adapt to different body shapes.',
          'The soft body-facing material feels comfortable against the body during wear.',
          'Structured material helps the piece hold its shape between wears.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
});

test('blocks awkward finish-and-silhouette grammar and duplicate brand positioning', () => {
  const value = draft({
    meta_description: 'Gold shoulder armor with a glossy gold finish and silhouette for Burning Man performances.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we are an independent design studio with a fresh point of view on festival, stage, and performance fashion. We create original ideas across different styles so people can choose a design that feels like them. This piece supports a bold look for the stage. It is designed for self-expression.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('meta_description_coordinates_finish_with_shape'));
  assert.ok(codes.includes('customer_copy_duplicates_stage_and_performance_fashion'));
});

test('blocks product details and robotic mechanisms inside Ideal for', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man looks that call for gold shoulder armor and a bold silhouette',
          'Festival outfits built around a metallic harness and skirt combination',
          'Rave styling when you want a structured gold statement piece',
          'Women looking for performance fashion with a stage-ready finish',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code.endsWith('_describes_product_detail_instead_of_use_case')));
});

test('allows Ideal for to name real people, productions and occasions', () => {
  const manualFocus = {
    event: ['Burning Man', 'festival', 'rave'],
    persona: ['warrior', 'performer'],
    audience: ['women'],
  };
  const value = draft({
    h1: 'Gold Shoulder Armor for Burning Man',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Women performers creating a warrior-inspired look for Burning Man',
          'DJs and dancers appearing on festival and rave stages',
          'Editorial photoshoots and music-video costume work',
          'Event productions and dance troupes planning coordinated stage wardrobes',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { manual_focus: manualFocus });
  assert.equal(result.issues.some((issue) => issue.code.startsWith('ideal_for_')), false);
});

test('requires a compact set to remain the page entity across SEO fields', () => {
  const productTruth = { included_components: ['Shoulders', 'Harness', 'Skirt'] };
  const reduced = validateSeoCommercialCopy(draft(), { product_truth: productTruth });
  const reducedCodes = reduced.issues.map((issue) => issue.code);
  assert.ok(reducedCodes.includes('seo_title_reduces_multi_component_product_to_one_piece'));
  assert.ok(reducedCodes.includes('h1_reduces_multi_component_product_to_one_piece'));
  assert.ok(reducedCodes.includes('meta_description_reduces_multi_component_product_to_one_piece'));
  assert.ok(reducedCodes.includes('about_this_piece_missing_whole_product_entity'));

  const complete = draft({
    seo_title: 'Gold Festival Armor Outfit for Burning Man',
    h1: 'Gold Festival Armor Outfit for Burning Man',
    meta_description: 'Gold festival armor outfit for Burning Man with an adjustable fit and a light-catching metallic finish.',
    intro: 'Create a Burning Man look with this complete gold festival outfit.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? {
        ...block,
        body: 'This complete festival outfit adds a strong gold finish to a Burning Man look while adjustable straps make the fit easier to fine-tune.',
      }
      : block),
  });
  const completeResult = validateSeoCommercialCopy(complete, { product_truth: productTruth });
  const presentationCodes = completeResult.issues
    .map((issue) => issue.code)
    .filter((code) => code.includes('multi_component') || code.includes('whole_product') || code.includes('deterministic_composition'));
  assert.deepEqual(presentationCodes, []);
});

test('blocks repeating deterministic compact-set composition in intro or About', () => {
  const productTruth = { included_components: ['Shoulders', 'Skirt'] };
  const value = draft({
    seo_title: 'Gold Warrior Costume for Burning Man',
    h1: 'Gold Warrior Costume for Burning Man',
    meta_description: 'Gold warrior costume for Burning Man and festival performances, with adjustable straps and a metallic finish.',
    intro: 'The complete outfit pairs a structured upper piece with a skirt for a bold festival silhouette.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? {
        ...block,
        body: 'This warrior costume brings together gold shoulders and a skirt in one coordinated outfit.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { product_truth: productTruth });
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('intro_repeats_deterministic_composition'));
  assert.ok(codes.includes('about_this_piece_repeats_deterministic_composition'));
});

test('blocks an unselected rave or cosplay focus when the operator chose Burning Man and festival', () => {
  const value = draft({
    h1: 'Gold Festival Armor for Burning Man',
    intro: 'Wear this gold armor costume at a rave or use it for a cosplay event.',
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: { event: ['burning man', 'festival'] },
  });
  const issue = result.issues.find((item) => item.code === 'customer_copy_uses_unselected_event_focus');
  assert.ok(issue);
  assert.match(issue?.message || '', /rave/);
  assert.match(issue?.message || '', /cosplay/);
});

test('blocks robotic editorial shorthand and search-query audience copy', () => {
  const value = draft({
    intro: 'The glossy metallic coating gives the outfit a clear finish for photographs.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Women looking for a gold festival outfit',
          'Festival performers appearing at Burning Man',
          'Editorial costume productions',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_robotic_editorial_jargon'));
  assert.ok(codes.includes('customer_copy_reads_like_search_query'));
});

test('blocks plus-size positioning unless Product Truth explicitly confirms it', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Plus-size festival performers preparing for Burning Man',
          'DJs and dancers appearing on festival stages',
          'Editorial photoshoots and music-video costume work',
        ].join('\n'),
      }
      : block),
  });

  const unsupported = validateSeoCommercialCopy(value, {
    product_truth: { included_components: ['Shoulders'] },
  });
  assert.ok(unsupported.issues.some((issue) => issue.code === 'unsupported_plus_size_claim'));

  const supported = validateSeoCommercialCopy(value, {
    product_truth: {
      included_components: ['Shoulders'],
      confirmed_size_range: 'Plus size',
    },
  });
  assert.equal(
    supported.issues.some((issue) => issue.code === 'unsupported_plus_size_claim'),
    false,
  );
});
