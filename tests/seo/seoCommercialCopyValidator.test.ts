import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSeoCommercialCopy } from '../../lib/seoCommercialCopyValidator.ts';
import { normalizeSeoEditorialCandidate } from '../../lib/seoEditorialCandidateSelection.ts';
import { validateSeoAgentOutput } from '../../lib/seoAgentOutputValidator.ts';

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
      { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we create original festival and stage fashion for people who want their look to feel personal. Every idea begins in our studio with a clear creative point of view. This piece brings that approach to a bold performance character. The finished look gives you room to express your own style.' },
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

test('blocks abstract visual pseudo-benefits and inferred component coverage', () => {
  const value = draft({
    intro: 'It turns a simple base look into a more finished costume with a stronger costume look.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? { ...block, body: 'The shoulders keep more of your outfit visible underneath.' }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_abstract_visual_pseudobenefit'));
  assert.ok(codes.includes('customer_copy_infers_unsupported_component_coverage'));
});

test('blocks purchase options repeated inside generated customer copy', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a costume that feels personal.',
          'Adjustable straps make the fit easier to set.',
          'The pieces are available separately or together, so you can restyle the outfit.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => (
    issue.code === 'customer_copy_repeats_code_owned_purchase_options'
    && issue.severity === 'blocker'
  )));
});

test('blocks abstract claims about keeping visual expressiveness', () => {
  const result = validateSeoCommercialCopy(draft({
    intro: 'The outfit stays easy to wear without losing visual expressiveness.',
  }));
  assert.ok(result.issues.some((issue) => (
    issue.code === 'customer_copy_contains_robotic_editorial_jargon'
    && issue.severity === 'blocker'
  )));
});

test('blocks modular-set composition commentary from the live final editor', () => {
  const value = draft({
    intro: 'Wear this set to Burning Man when you want to anchor an armored outfit around gold detail.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return { ...block, body: 'For a festival, this warrior armor costume lets you skip a full uniform and still feel dressed for the occasion.' };
      }
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'Original studio design gives you an option that feels more specific than standard festival basics.',
            'Matching gold pieces repeat the same color above and below the waist, so the outfit photographs as one outfit instead of separate add-ons.',
          ].join('\n'),
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_abstract_visual_pseudobenefit'));
  assert.ok(codes.includes('customer_copy_uses_invented_template_comparison'));
});

test('blocks invented convenience and photo mechanisms from the latest live editor', () => {
  const value = draft({
    intro: 'Wear this gold set to Burning Man without building one from separate finds. The studio-designed styling makes it easier to choose boots and jewelry that make sense with the outfit.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? {
        ...block,
        body: 'At Burning Man, this warrior armor costume gives your outfit a gold focal point that photographs well in wide shots. The visible waist detail gives you a natural break for changing tops.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => (
    issue.code === 'customer_copy_contains_abstract_visual_pseudobenefit'
    && issue.severity === 'blocker'
  )));
});

test('blocks generic-clothing comparisons and internal persona or direction labels from live copy', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'For Burning Man, this gold armor set offers a shaped option when generic festival dressing can feel too plain on its own.',
        };
      }
      if (block.block_key === 'ideal_for') {
        return {
          ...block,
          body: [
            'Burning Man attendees dressing in a warrior direction',
            'Festival-goers leaning into a warrior persona',
            'Performers preparing a costume for a live show',
            'Content creators planning an editorial wardrobe shoot',
          ].join('\n'),
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: { event: ['Burning Man', 'festival'], persona: ['warrior'] },
  });
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_uses_invented_template_comparison'));
  assert.ok(codes.includes('customer_copy_uses_internal_targeting_language'));
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

test('blocks the 2026-08-06 preview provenance leak and repeated Ideal-for frame', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'The owner-approved vegan-leather story confirms a glossy coating and its confirmed metal-like finish for this warrior costume.',
        };
      }
      if (block.block_key === 'ideal_for') {
        return {
          ...block,
          body: [
            'Festival-goers who need a warrior costume for a long day of music.',
            'Cosplayers who need an original interpretation for a fantasy character.',
            'Live performers who need a warrior costume for a stage production.',
            'Content creators who need a fantasy costume for themed shoots.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we are an independent design team making festival and stage fashion. Our studio develops original ideas for people who want a personal character. This costume carries that approach into a futuristic warrior look. It supports self-expression through a design that feels like your own.',
        };
      }
      return block;
    }),
  });

  const codes = validateSeoCommercialCopy(value).issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_contains_internal_audit_language'));
  assert.ok(codes.includes('customer_copy_uses_independence_as_padding'));
  assert.ok(codes.includes('ideal_for_repeats_who_need_template'));
});

test('blocks abstract shorthand copied by the latest live final editor', () => {
  const value = draft({
    intro: 'The set has a strong, sculpted feel for photo moments and themed nights.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we create original festival designs for personal style. Our ideas help each wearer find something that feels like them. This set completes the look with confidence and reads clearly in photographs.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => (
    issue.code === 'customer_copy_contains_robotic_editorial_jargon'
    && issue.severity === 'blocker'
  )));
});

test('blocks repeated product, persona, or component terms inside one About sentence', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? {
        ...block,
        body: 'This warrior armor costume is made for a warrior persona. The skirt can be worn over boots under the same skirt.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('about_this_piece_sentence_1_repeats_same_term'));
  assert.ok(codes.includes('about_this_piece_sentence_2_repeats_same_term'));
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

test('recognizes the idiomatic plural Festivals as the selected festival focus', () => {
  const result = validateSeoCommercialCopy(
    draft({ h1: 'Warrior Armor Costume for Festivals' }),
    { manual_focus: { event: ['festival'] } },
  );
  assert.equal(result.issues.some((issue) => issue.code === 'h1_missing_operator_event_focus'), false);
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

test('blocks an unsold base layer in ALT even when it is visible in the image', () => {
  const value = draft({
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold shoulder armor and skirt worn over a dark base layer outdoors',
      truth_basis: 'visible_product_fact',
    }],
  });
  const result = validateSeoCommercialCopy(value, {
    product_truth: { included_components: ['Shoulders', 'Skirt'] },
  });
  assert.ok(result.issues.some((issue) => issue.code === 'image_alt_mentions_unsold_styling_item'));
});

test('blocks one base-layer styling idea repeated across metadata and left-copy owners', () => {
  const base = draft();
  const value = draft({
    meta_description: 'Warrior armor costume that leaves simple layers visible.',
    intro: 'Wear it over a simple layer without covering everything underneath.',
    pdp_blocks: base.pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'This warrior armor costume adds shape to basic layers. Wear the skirt over leggings to change the balance between skin and fabric.',
        };
      }
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'Original studio design leaves room for your own jewelry.',
            'A visible base layer lets you swap sleeves between wears.',
            'The skirt moves as you walk.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we are an independent design studio. We create original costume pieces for personal styling. Our work lets you keep your own base layers and jewelry in the outfit.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'repeated_idea_base_layer_styling'));
  assert.ok(result.repetition_report?.repeated_idea_groups.some((item) => (
    item.idea === 'base_layer_styling' && item.blocks.length >= 3
  )));
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

test('treats photographers and studio portraits as a real photoshoot buyer context', () => {
  const result = validateSeoCommercialCopy(draft({
    h1: 'Brown Leather Harness Top for Photoshoot',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
          ...block,
          body: [
            'Men seeking a classic brown leather harness for portrait or editorial shoots.',
            'Models drawn to vintage-inspired chest styling for refined menswear photography.',
            'Photographers developing brown-leather looks for studio portraits.',
            'Costume stylists selecting a distinctive chest harness for editorial productions.',
          ].join('\n'),
        }
      : block),
  }), {
    manual_focus: {
      event: ['photoshoot'],
      style: ['classic'],
      audience: ['men'],
    },
  });

  assert.equal(result.issues.some((issue) => issue.code === 'ideal_for_3_has_no_person_or_use_case'), false);
  assert.equal(result.issues.some((issue) => issue.code === 'ideal_for_missing_operator_event_focus'), false);
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

test('does not misclassify a silhouette photo outcome as a third finish claim', () => {
  const value = draft({
    meta_description: 'Gold sci fi armor costume for Burning Man with a polished metal look and a sharp futuristic edge.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'For Burning Man, this sci fi armor outfit uses a durable, glossy, mirror-like coating for a polished finish. Its sculptural form gives the complete costume a clear futuristic direction for festival styling.',
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we create original festival pieces from our own ideas. This sci fi armor outfit reflects our studio approach to futuristic design. We keep the silhouette clear so the character reads clearly in photos, performance, and motion. The finished result leaves room for your own visual identity.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);

  assert.equal(result.issues.some((issue) => issue.code === 'repeated_idea_reflective_finish'), false);
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

test('recognizes ready for repeat wear as a concrete shape-retention outcome', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive piece for a personal festival look.',
          'Adjustable straps let you fine-tune a secure fit for your body shape.',
          'The body-facing material feels more comfortable during wear.',
          'Structured material helps the design keep its shape, so it stays ready for repeat wear.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
});

test('accepts product-specific styling, framing and movement instead of repeating the fixed panel', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive starting point for a personal look.',
          'The gold shoulder armor frames your face and upper body in photographs.',
          'The skirt panels move as you walk or dance, adding motion to photographs and stage work.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
  assert.ok(result.benefit_categories_found.includes('wearer_framing'));
  assert.ok(result.benefit_categories_found.includes('movement_in_wear'));
});

test('blocks inferred styling flexibility built from separate pieces', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive starting point for a personal look.',
          'Separate pieces let you change the base layer without replacing the rest of the outfit.',
          'The glossy gold finish catches available light in photographs.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_repeats_code_owned_purchase_options'));
});

test('blocks separate-piece wording even when it comes before the wear outcome', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive starting point for a personal look.',
          'Because the pieces are separate, you can wear one with other layers.',
          'The glossy gold finish catches available light in photographs.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_repeats_code_owned_purchase_options'));
});

test('blocks component restyling that re-narrates how the set is split', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive starting point for a personal look.',
          'Wear the shoulders over different tops to restyle the set without starting over.',
          'The glossy gold finish catches available light in photographs.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_repeats_code_owned_purchase_options'));
});

test('blocks a Why section collapsed to two benefit families', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design is not tied to a named character, so you can make the warrior persona your own.',
          'The skirt is separately selectable, so you can order only that part when you do not need the full set.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code === 'why_youll_love_it_wrong_benefit_count'), true);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_repeats_code_owned_purchase_options'));
  assert.ok(result.benefit_categories_found.includes('studio_design_and_craft'));
  assert.ok(result.benefit_categories_found.includes('styling_flexibility'));
});

test('blocks separately selectable parts with buy, replace and reorder outcomes', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'This original studio design lets you make the warrior persona your own instead of copying a named character.',
          'Each part is separately selectable, so you can buy one piece for a restyle or replace what you own without reordering the full set.',
          'Adjustable straps leave room to fine-tune a secure fit for different body shapes.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_repeats_code_owned_purchase_options'));
});

test('still blocks a single Why benefit instead of accepting an underfilled block', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: 'Our original studio design is not tied to a named character, so you can make the warrior persona your own.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'why_youll_love_it_wrong_benefit_count'));
});

test('does not confuse building a personal look with product construction', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original design ideas give you a distinctive piece you can use to build a festival look that feels personal.',
          'Adjustable straps make it quick to put on and easy to adapt to different body shapes.',
          'Structured material helps the piece hold its shape between wears.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(
    result.issues.some((issue) => issue.code === 'why_youll_love_it_repeats_construction_as_multiple_benefits'),
    false,
  );
});

test('recognizes available-light finish behavior and feels-like-them self-expression', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'why_youll_love_it') {
        return {
          ...block,
          body: [
            'Our original studio design gives you a distinctive piece for building a festival look that feels personal.',
            'Adjustable straps make it quick to put on and easy to adapt to different body shapes.',
            'The glossy finish catches available light, which keeps the product detail visible in photographs.',
          ].join('\n'),
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we are an independent design team with a fresh point of view on festival and stage fashion. Our varied original ideas help people find a design that feels like them. We make pieces that support a personal visual identity. This one is suited to an approved festival setting.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(
    result.issues.some((issue) => issue.code === 'why_youll_love_it_benefit_3_has_feature_but_no_buyer_outcome'),
    false,
  );
  assert.equal(
    result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'),
    false,
  );
});

test('recognizes natural pick-up-light wording as verified finish behavior', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives you a distinctive starting point for a personal look.',
          'The gold shoulder armor frames your face and upper body in photographs.',
          'The glossy surface picks up available light, so the gold looks brighter in photos.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
  assert.ok(result.benefit_categories_found.includes('verified_finish_behavior'));
});

test('recognizes natural restyling and daylight photo benefits from the live pilot', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Original studio design gives you a gold look you can wear with your own layers.',
          'The skirt can be restyled with different base layers from one wear to the next.',
          'The glossy gold surface catches daylight, so it photographs brighter outdoors.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code.startsWith('why_youll_love_it_')), false);
  assert.ok(result.benefit_categories_found.includes('studio_design_and_craft'));
  assert.ok(result.benefit_categories_found.includes('styling_flexibility'));
  assert.ok(result.benefit_categories_found.includes('verified_finish_behavior'));
});

test('recognizes a supported gold-finish photo outcome without requiring stock phrasing', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'why_youll_love_it'
      ? {
        ...block,
        body: [
          'Our original studio design gives your outfit a personal identity.',
          'Adjustable straps help you fine-tune the fit for more comfortable wear.',
          'The gold finish helps details stay visible in photographs as available light changes.',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(
    result.issues.some((issue) => issue.code === 'why_youll_love_it_benefit_3_has_no_concrete_buyer_value'),
    false,
  );
  assert.equal(
    result.issues.some((issue) => issue.code === 'why_youll_love_it_benefit_3_has_feature_but_no_buyer_outcome'),
    false,
  );
});

test('does not mistake “more like your own style” for a promise of social likes', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we are an independent design studio with original ideas for festival fashion. We help people choose a design that feels personal. The finished outfit can feel more like your own style while keeping the selected warrior direction clear.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(
    result.issues.some((issue) => issue.code === 'customer_copy_guarantees_popularity_or_reactions'),
    false,
  );
});

test('blocks an unselected high-intent style added by generated copy', () => {
  const value = draft({
    h1: 'Gold Shoulder Armor for Burning Man',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man attendees building a warrior-inspired look',
          'Festival performers preparing for live shows',
          'Costume designers planning a fantasy production',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: {
      event: ['Burning Man', 'festival'],
      persona: ['warrior'],
      style: null,
    },
  });
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_uses_unselected_style_focus'));
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

test('blocks thin Ideal for keyword fragments and stacked audience roles', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man costumes',
          'Festival wear',
          'Performers, dancers, DJs, and show artists preparing festival outfits',
          'Content creators and costume stylists planning an editorial shoot',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: { event: ['Burning Man', 'festival'], persona: ['warrior'] },
  });
  assert.ok(result.issues.some((issue) => issue.code === 'ideal_for_1_too_thin'));
  assert.ok(result.issues.some((issue) => issue.code === 'ideal_for_3_stacks_buyer_roles'));
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
          'Editorial teams preparing costume work for photoshoots and music videos',
          'Event productions and dance troupes planning coordinated stage wardrobes',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { manual_focus: manualFocus });
  assert.equal(result.issues.some((issue) => issue.code.startsWith('ideal_for_')), false);
});

test('blocks repeating the same selected focus twice inside one Ideal for bullet', () => {
  const value = draft({
    h1: 'Gold Shoulder Armor for Burning Man',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man attendees styling a warrior look for Burning Man',
          'Festival dancers preparing for outdoor performances',
          'Content creators photographing costumes for editorial shoots',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: { event: ['Burning Man', 'festival'], persona: ['warrior'] },
  });
  assert.ok(result.issues.some((issue) => issue.code === 'ideal_for_1_repeats_same_term'));
});

test('blocks a repeated meaningful word inside one Ideal for bullet', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man attendees preparing outdoor photos',
          'Festival dancers performing through long sets',
          'Warrior-inspired performers wearing a warrior look on stage',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'ideal_for_3_repeats_same_term'));
});

test('blocks unselected material padding in SEO title and H1', () => {
  const value = draft({
    seo_title: 'Warrior Armor Costume for Burning Man | Gold Vegan Leather',
    h1: 'Warrior Armor Costume for Burning Man in Gold Vegan Leather',
  });
  const blocked = validateSeoCommercialCopy(value, {
    keyword_roles: { primary: [{ keyword: 'warrior armor costume' }] },
  });
  assert.ok(blocked.issues.some((issue) => issue.code === 'seo_title_uses_unselected_material_padding'));
  assert.ok(blocked.issues.some((issue) => issue.code === 'h1_uses_unselected_material_padding'));

  const allowed = validateSeoCommercialCopy(value, {
    keyword_roles: { primary: [{ keyword: 'vegan leather warrior armor costume' }] },
  });
  assert.equal(allowed.issues.some((issue) => issue.code.endsWith('_uses_unselected_material_padding')), false);
});

test('blocks design-review shorthand that sounds unnatural to shoppers', () => {
  const result = validateSeoCommercialCopy(draft({
    intro: 'This design shows up cleanly in crowd photos, while the photos pick up more depth. It stands apart from a basic metallic look.',
    h1: 'Warrior Armor Costume for Burning Man Styling',
  }));
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_contains_robotic_editorial_jargon'));
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_uses_invented_template_comparison'));
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

test('blocks a vague component recap even without an inventory verb', () => {
  const productTruth = { included_components: ['Shoulders', 'Skirt'] };
  const value = draft({
    seo_title: 'Gold Warrior Costume for Burning Man',
    h1: 'Gold Warrior Costume for Burning Man',
    meta_description: 'Gold warrior costume for Burning Man and festival performances, with adjustable straps and a metallic finish.',
    intro: 'Create a Burning Man look with this complete gold warrior costume.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? {
        ...block,
        body: 'This warrior costume is made for Burning Man. The shoulder pieces and skirt create a distinctive look for stage and photos.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { product_truth: productTruth });
  assert.ok(result.issues.some((issue) => issue.code === 'about_this_piece_repeats_deterministic_composition'));
});

test('blocks compact-set inventory in meta and generic pairing in intro', () => {
  const productTruth = { included_components: ['Shoulders', 'Skirt'] };
  const value = draft({
    seo_title: 'Gold Warrior Costume for Burning Man',
    h1: 'Gold Warrior Costume for Burning Man',
    meta_description: 'Gold warrior costume with shoulders and skirt for Burning Man and festival performances.',
    intro: 'This costume pairs a structured upper piece with a skirt for a festival look.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? { ...block, body: 'This complete warrior costume is designed for festival performance.' }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { product_truth: productTruth });
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('meta_description_repeats_deterministic_composition'));
  assert.ok(codes.includes('intro_repeats_deterministic_composition'));
});

test('does not confuse pairing with personal styling for a component-inventory recap', () => {
  const productTruth = { included_components: ['Shoulders', 'Skirt'] };
  const value = draft({
    seo_title: 'Warrior Armor Costume for Burning Man',
    h1: 'Warrior Armor Costume for Burning Man',
    meta_description: 'Warrior armor costume for Burning Man that pairs with your own accessories and supports personal styling.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? { ...block, body: 'This warrior armor costume is designed for Burning Man and personal festival styling.' }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { product_truth: productTruth });
  assert.equal(result.issues.some((issue) => issue.code === 'meta_description_repeats_deterministic_composition'), false);
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

test('blocks buyer-segment filler written as buyers who want', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Burning Man buyers who want a gold warrior look',
          'Festival performers and dancers',
          'Editorial costume productions',
        ].join('\n'),
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_reads_like_search_query'));
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

test('blocks the exact robotic language seen in the 2026-08-07 pilot', () => {
  const value = draft({
    intro: 'For buyers building a stage look, the finish creates clear visual depth.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'why_youll_love_it') {
        return { ...block, body: 'The body-facing feel supports comfort.\nThe finish gives you a warrior presence.\nOur studio design feels personal.' };
      }
      if (block.block_key === 'main_description') {
        return { ...block, body: 'At TheFEYA, we make stage fashion. That is where TheFEYA lives, with a clear point of view and original ideas for your own style.' };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_contains_pilot_robotic_language'));
});

test('blocks the grammar and repeated finish language from the 2026-08-08 paid pilot', () => {
  const value = draft({
    meta_description: 'Warrior armor costume with a glossy, mirror-like coating, made for festivals and cosplay and an original futuristic or fantasy character.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'This warrior armor outfit pairs a glossy gold finish with a multi-component silhouette. The material has a durable, glossy, mirror-like coating. The glossy, mirror-like surface gives the costume a polished metal finish for bold styling at festivals.',
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. This warrior armor outfit supports a futuristic festival look. We design for distinctive presence, so you can make the look your own.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value);
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('meta_description_has_broken_context_coordination'));
  assert.ok(codes.includes('customer_copy_contains_pilot_robotic_language'));
  assert.ok(codes.includes('customer_copy_contains_robotic_editorial_jargon'));
  assert.ok(codes.includes('about_this_piece_repeats_finish_across_sentences'));
});

test('blocks an operator-selected style pair repeated across three customer-copy sections', () => {
  const value = draft({
    intro: 'This armor supports an original futuristic or fantasy character for festivals and cosplay.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => {
      if (block.block_key === 'about_this_piece') {
        return {
          ...block,
          body: 'A glossy finish gives the armor a polished look. Its structured form supports a futuristic or fantasy character for the occasion.',
        };
      }
      if (block.block_key === 'main_description') {
        return {
          ...block,
          body: 'At TheFEYA, we develop festival and stage pieces from our own ideas. This armor reflects our studio approach to a futuristic or fantasy character. The design gives you a starting point for the occasion. You keep room for your own visual identity and style.',
        };
      }
      return block;
    }),
  });
  const result = validateSeoCommercialCopy(value, {
    manual_focus: { style: ['futuristic', 'fantasy'] },
  });
  assert.ok(result.issues.some((issue) => (
    issue.code === 'repeated_idea_selected_style_pair_futuristic_fantasy'
    && issue.severity === 'blocker'
  )));
});

test('blocks bare singular Festival grammar in SEO title and H1', () => {
  const result = validateSeoCommercialCopy(draft({
    seo_title: 'Warrior Armor Costume for Festival',
    h1: 'Warrior Armor Costume for Festival',
  }));
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('seo_title_uses_bare_festival_suffix'));
  assert.ok(codes.includes('h1_uses_bare_festival_suffix'));
});

test('keeps large-set inventory out of generated Meta, Intro and About', () => {
  const productTruth = { included_components: ['Headpiece', 'Leg Covers', 'Shoulders', 'Top'] };
  const value = draft({
    seo_title: 'Gold Warrior Costume for Festival Performance',
    h1: 'Gold Warrior Costume for Festival Performance',
    meta_description: 'Gold warrior costume with a headpiece, leg covers, shoulders and top for festival performance.',
    intro: 'This complete costume combines a headpiece, leg covers, shoulders and top for the stage.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? { ...block, body: 'This warrior costume includes a headpiece, leg covers, shoulders and top for festival shows.' }
      : block),
  });
  const result = validateSeoCommercialCopy(value, { product_truth: productTruth });
  const codes = result.issues.map((issue) => issue.code);
  assert.ok(codes.includes('meta_description_repeats_deterministic_composition'));
  assert.ok(codes.includes('intro_repeats_deterministic_composition'));
  assert.ok(codes.includes('about_this_piece_repeats_deterministic_composition'));
});

test('blocks repetitive original modifiers and negative replica framing', () => {
  const value = draft({
    intro: 'This studio costume is not a copy or replica.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: [
          'Festival-goers planning an original warrior look for a full day of music.',
          'Cosplayers creating an original fantasy character for a themed production.',
          'Live performers preparing an original costume for a stage show.',
          'Content creators styling an original look for music videos and shoots.',
        ].join('\n'),
      }
      : block),
  });
  const codes = validateSeoCommercialCopy(value).issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_uses_invented_template_comparison'));
  assert.ok(codes.includes('ideal_for_overuses_original_modifier'));
});

test('blocks negative cosplay positioning through borrowing comparisons', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. This gold look supports a futuristic character without borrowing from anyone else’s character. Our studio gives the wearer a clear starting point. It helps them make the look their own.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.ok(result.issues.some((issue) => issue.code === 'customer_copy_uses_invented_template_comparison'));
});

test('recognizes make the look their own as a clear self-expression outcome', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. Our studio develops each piece around an original character idea. This gold look brings that approach to a live performance. It gives the wearer room to make the look their own.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'), false);
});

test('recognizes a design that feels personal as a self-expression outcome', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'main_description'
      ? {
        ...block,
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. Our studio develops each piece around an original character idea. This gold look brings that approach to a live performance. You can make the final styling your own.',
      }
      : block),
  });
  const result = validateSeoCommercialCopy(value);
  assert.equal(result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'), false);
});

test('blocks structured material and unfinished design-review language', () => {
  const value = draft({
    intro: 'The original black silhouette is a starting point while the structured material holds its form for your final look choices.',
  });
  const codes = validateSeoCommercialCopy(value).issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_calls_material_structured'));
  assert.ok(codes.includes('customer_copy_uses_design_review_or_unfinished_language'));
});

test('blocks camera-crop pseudo-benefits and vague comfort mechanisms', () => {
  const value = draft({
    intro: 'The costume looks striking in full-length photos. A comfortable feel supports longer festival days.',
  });
  const codes = validateSeoCommercialCopy(value).issues.map((issue) => issue.code);
  assert.ok(codes.includes('customer_copy_uses_photo_crop_as_product_benefit'));
  assert.ok(codes.includes('customer_copy_uses_vague_comfort_mechanism'));
});

test('blocks one planning frame repeated across Ideal for', () => {
  const value = draft({
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'ideal_for'
      ? {
        ...block,
        body: 'Women planning an outfit for a live music production.\nFestival-goers planning a costume for a long day of music.\nPerformers planning a stage look for a theatrical production.\nContent creators producing visuals for music videos and editorials.',
      }
      : block),
  });
  const codes = validateSeoCommercialCopy(value).issues.map((issue) => issue.code);
  assert.ok(codes.includes('ideal_for_repeats_action_template'));
});

test('enforces the confirmed color-to-finish matrix', () => {
  const blackCodes = validateSeoCommercialCopy(
    draft({ intro: 'This black outfit has a polished metal finish for Halloween.' }),
    { product_truth: { color: 'Black' } },
  ).issues.map((issue) => issue.code);
  assert.ok(blackCodes.includes('color_finish_mismatch_metal_language'));

  const goldCodes = validateSeoCommercialCopy(
    draft({ intro: 'This gold outfit has an iridescent color-shifting finish for festivals.' }),
    { product_truth: { color: 'Gold' } },
  ).issues.map((issue) => issue.code);
  assert.ok(goldCodes.includes('color_finish_mismatch_color_shift_language'));
});

test('allows shiny holographic truth but blocks direct metal, mirrored, reflective, or sparkling claims', () => {
  const allowed = validateSeoCommercialCopy(
    draft({ intro: 'This shiny holographic outfit shows subtle color shifts in changing light and movement.' }),
    { product_truth: { color: 'Holographic' } },
  );
  assert.equal(allowed.issues.some((issue) => /color_finish_mismatch|holographic_finish_overstates|unsupported_reflective/.test(issue.code)), false);

  const blocked = validateSeoCommercialCopy(
    draft({ intro: 'The holographic material is metallic, mirrored, reflective, and sparkling.' }),
    { product_truth: { color: 'Holographic' } },
  );
  const codes = blocked.issues.map((issue) => issue.code);
  assert.ok(codes.includes('color_finish_mismatch_metal_language'));
  assert.ok(codes.includes('holographic_finish_overstates_mirrored_or_sparkling_behavior'));
  assert.ok(codes.includes('unsupported_reflective_finish_claim'));
});

test('permits an approved indirect optical aesthetic without turning it into a material claim', () => {
  const context = {
    product_truth: { color: 'Holographic' },
    keyword_roles: {
      secondary: [{ keyword: 'reflective rave outfit' }],
      support: [],
    },
  };
  const allowed = validateSeoCommercialCopy(
    draft({ meta_description: 'Reflective-inspired rave styling with a shiny holographic look for stage performance.' }),
    context,
  );
  assert.equal(allowed.issues.some((issue) => issue.code === 'unsupported_reflective_finish_claim'), false);
  assert.equal(allowed.issues.some((issue) => issue.code === 'customer_copy_uses_unselected_indirect_optical_keyword'), false);
  assert.equal(allowed.issues.some((issue) => issue.code === 'customer_copy_turns_indirect_optical_keyword_into_material_claim'), false);

  const materialClaim = validateSeoCommercialCopy(
    draft({ intro: 'The material has a reflective-inspired finish for rave nights.' }),
    context,
  );
  assert.ok(materialClaim.issues.some((issue) => issue.code === 'customer_copy_turns_indirect_optical_keyword_into_material_claim'));

  const unselected = validateSeoCommercialCopy(
    draft({ meta_description: 'Sparkling-inspired rave styling with a shiny holographic look for stage performance.' }),
    context,
  );
  assert.ok(unselected.issues.some((issue) => issue.code === 'customer_copy_uses_unselected_indirect_optical_keyword'));
});

test('keeps the renormalized saved Festival draft commercially clean', () => {
  const value = {
    seo_title: 'Gold Skirt And Top Set Festival',
    h1: 'Gold Skirt And Top Set Festival',
    meta_description: 'Gold skirt and top set festival with a glossy mirror-like finish for long festival days, live performances, and creative shoots.',
    intro: 'This gold festival outfit brings an original, fashion-led studio design to long festival days, live performances, and creative shoots.',
    bullet_highlights: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'Gold skirt and top outfit festival worn on a city walkway', truth_basis: 'visible_product_fact' }],
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'Made for festivals and live performance, this gold outfit has a smooth, glossy, mirror-like finish with a bold fashion-led character. Its bold design comes through in motion, close-up details, wider festival scenes, video, and live performance.',
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: 'Designed in our fashion studio, the gold set has a distinctive, glamorous character that feels personal and memorable.\nThe smooth vegan leather feels comfortable against the body, making the outfit easier to wear for extended periods.\nCareful storage helps the gold outfit keep its shape beautifully between wears and remain ready for repeat wear.',
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: 'Women seeking an expressive gold outfit for live music productions.\nFestival-goers drawn to glam gold styling for long days of music and movement.\nPerformers and dancers choosing a striking outfit for live stage appearances.\nContent creators producing polished festival shoots, music videos, or digital campaigns.\nCostume stylists selecting a distinctive gold outfit for themed shows or editorials.',
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'At TheFEYA, our designers develop this gold festival set from original ideas. Its polished, fashion-led character gives the outfit a recognizable presence in crowds, on stage, and across photos and video. The studio-created design supports confident personal style through festival days, live performances, and future events.',
      },
    ],
  };
  const result = validateSeoCommercialCopy(value, {
    product_truth: { color: 'Gold', included_components: ['Top Only', 'Skirt Only'] },
    manual_focus: { event: ['festival'], style: ['glam'], audience: ['women'] },
    keyword_roles: {
      primary: [{ keyword: 'skirt and top set festival' }],
      secondary: [{ keyword: 'gold skirt set' }, { keyword: 'festival skirt set' }],
      support: [{ keyword: 'festival skirt and top' }],
    },
  });

  assert.deepEqual(
    result.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
    [],
  );
  assert.equal(result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'), false);
});

test('repairs the paid holographic review control to a zero-token commercial PASS', () => {
  const context = {
    product_truth: {
      color: 'Holographic',
      included_components: ['Skirt Only', 'Top Only'],
    },
    manual_focus: {
      event: ['rave', 'stage'],
      style: ['glam'],
      persona: ['dancer'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'rave skirt and top set' }],
      secondary: [{ keyword: 'rave outfit with skirt' }],
      support: [{ keyword: 'holographic rave skirt' }],
    },
  };
  const value = {
    seo_title: 'Holographic Rave Skirt And Top Set',
    h1: 'Holographic Rave Skirt And Top Set',
    meta_description: 'Holographic rave skirt and top set with an iridescent finish for rave nights and stage moments.',
    intro: 'This rave skirt and top outfit is designed for rave and the stage, where its original studio design creates a bold, distinctive look.',
    bullet_highlights: [],
    image_alt_candidates: [{ image_role: 'primary', alt_text: 'holographic rave skirt and top outfit worn standing in a studio setting', truth_basis: 'visible_product_fact' }],
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'Built for rave and stage moments, this rave skirt and top outfit pairs a striking top with a flared skirt that moves beautifully in the light. Its smooth, shiny holographic surface shows subtle color shifts in changing light and movement. The finish feels sleek and eye-catching without losing its polished edge.',
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: 'Our original studio design gives the outfit a distinctive, memorable character that feels genuinely personal.\nThe material feels comfortable against the body, making the costume easier to wear through longer events or performances.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: 'Women preparing an expressive costume for a live music production.\nFestival-goers planning a dancer look for a long day of music and movement.\nLive performers preparing a dancer look for a stage show or theatrical role.\nContent creators planning dancer visuals for rave shoots or music videos.\nCostume stylists sourcing an original glam piece for themed shows or editorials.',
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'We designed this rave skirt and top outfit for women who want a bold, distinctive presence at rave and stage events. We at TheFEYA develop original pieces from our own ideas, and this one brings a bright, iridescent energy that feels memorable from the first glance. We shaped it to read as glamorous, performance-ready, and unmistakably alive in motion.',
      },
    ],
    generation_notes: [],
  };
  const normalized = normalizeSeoEditorialCandidate(value, {
    primary_keyword: 'rave skirt and top set',
    selected_events: ['rave', 'stage'],
    selected_styles: ['glam'],
    included_components: ['Top', 'Skirt'],
    product_color: 'Holographic',
  });
  const result = validateSeoCommercialCopy(normalized, context);
  assert.deepEqual(
    result.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
    [],
  );
  assert.equal(result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'), false);
});

test('repairs the paid harness and metallic-set drafts to a zero-token commercial PASS', () => {
  const controls = [
    {
      name: 'black harness',
      normalization: {
        primary_keyword: 'leather harness outfit',
        selected_events: ['festival', 'pride'],
        selected_styles: ['punk'],
        selected_materials: ['black', 'leather'],
        included_components: ['Choker', 'Garters', 'Chest Harness'],
        product_color: 'Needs review',
      },
      validation: {
        product_truth: { color: 'Black', included_components: ['Choker', 'Garters', 'Chest Harness'] },
        manual_focus: { event: ['festival', 'pride'], style: ['punk'], audience: ['men'] },
        keyword_roles: { primary: [{ keyword: 'leather harness outfit' }] },
      },
      value: {
        seo_title: 'Black Leather Harness Outfit for Festivals',
        h1: 'Black Leather Harness Outfit for Festivals',
        meta_description: 'Black leather harness outfit with a smooth, polished finish for Pride and festival looks.',
        intro: 'For festivals and Pride, this leather harness costume gives men a bold, distinctive studio-made presence that reads instantly under lights and in a crowd.',
        bullet_highlights: [],
        image_alt_candidates: [{ image_role: 'primary', alt_text: 'Man wearing a black chest harness, choker and leg garters', truth_basis: 'visible_product_fact' }],
        pdp_blocks: [
          { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Built for festivals and Pride, this leather harness costume gives men a sharp, confident presence with a striking black finish. Its smooth, high-gloss surface gives the piece a clean, polished finish.' },
          { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.' },
          { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Men seeking a punk look for a live music production.\nFestival-goers drawn to harness outfit festival energy for a long day of music and movement.\nContent creators producing bold visuals for festival shoots or music videos.\nCostume stylists selecting an original chest-and-leg harness design for themed shows or editorials.' },
          { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'We designed this leather harness costume for men who want a bold, memorable presence at festivals and Pride events. Our fashion studio shaped TheFEYA to feel direct, unapologetic, and easy to read from the first glance. The black leather look gives the piece a tough punk edge that stands out in a crowd.' },
        ],
        generation_notes: [],
      },
    },
    {
      name: 'silver metallic set',
      normalization: {
        primary_keyword: 'metallic top and skirt set',
        selected_events: ['festival', 'stage'],
        selected_styles: ['futuristic', 'cosmic', 'glam'],
        included_components: ['Choker', 'Top', 'Skirt'],
        product_color: 'Silver',
      },
      validation: {
        product_truth: { color: 'Silver', included_components: ['Choker', 'Top', 'Skirt'] },
        manual_focus: { event: ['festival', 'stage'], style: ['futuristic', 'cosmic', 'glam'], persona: ['performer', 'showgirl', 'dancer'], audience: ['women'] },
        keyword_roles: { primary: [{ keyword: 'metallic top and skirt set' }] },
      },
      value: {
        seo_title: 'Silver Metallic Top And Skirt Set for Festivals',
        h1: 'Silver Metallic Top And Skirt Set for Festivals',
        meta_description: 'Metallic top and skirt set with a polished silver finish for festival nights and stage moments.',
        intro: 'For festivals and the stage, this metallic top and skirt outfit brings a bold, distinctive presence with its original studio design and polished silver attitude.',
        bullet_highlights: [],
        image_alt_candidates: [{ image_role: 'primary', alt_text: 'Woman wearing a silver top, skirt and choker', truth_basis: 'visible_product_fact' }],
        pdp_blocks: [
          { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'For festivals and stage moments, this metallic top and skirt outfit brings a polished, metal-inspired finish that feels bold from every angle. The silver surface catches light beautifully, giving the set a striking, futuristic presence that stands out in motion.' },
          { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.' },
          { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Women seeking an expressive outfit for a live music production.\nFestival-goers drawn to a dancer look for a long day of music and movement.\nLive performers choosing a dancer look for a stage show or theatrical role.\nContent creators producing glam visuals for festival shoots or music videos.\nCostume stylists selecting an original futuristic design for themed shows or editorials.' },
          { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'We designed this metallic top and skirt outfit for women who want festival energy with a futuristic edge. TheFEYA shaped it as an original studio piece for performance moments where presence matters. Our designers kept the look bold, polished, and memorable, so it feels like your own signal in the room. It reads like a silver star with a fearless pulse.' },
        ],
        generation_notes: [],
      },
    },
  ];

  for (const control of controls) {
    const normalized = normalizeSeoEditorialCandidate(control.value, control.normalization);
    const result = validateSeoCommercialCopy(normalized, control.validation);
    assert.deepEqual(
      result.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
      [],
      control.name,
    );
    assert.equal(
      result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'),
      false,
      control.name,
    );
    const structural = validateSeoAgentOutput({
      contract_version: 'seo_agent_output_v1',
      status: 'draft',
      faq: [],
      internal_linking_hints: [],
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
      ...normalized,
      pdp_blocks: normalized.pdp_blocks.map((block: any) => ({
        source_basis: 'product_fact',
        needs_human_review: false,
        ...block,
      })),
    });
    assert.deepEqual(
      structural.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
      [],
      `${control.name} structural`,
    );
  }
});

test('allows an approved multi-piece Primary in Meta without treating it as an inventory recap', () => {
  const result = validateSeoCommercialCopy({
    ...draft(),
    seo_title: 'Silver Metallic Top And Skirt Set for Festivals',
    h1: 'Silver Metallic Top And Skirt Set for Festivals',
    meta_description: 'Metallic top and skirt set for women, created for festivals and stage performance.',
    intro: 'This silver festival outfit brings an original studio design to live performance.',
    pdp_blocks: draft().pdp_blocks.map((block: any) => block.block_key === 'about_this_piece'
      ? { ...block, body: 'This complete silver outfit is designed for festival and stage use. Its original studio character gives performers a memorable choice for photos, video, and live appearances.' }
      : block),
  }, {
    product_truth: { color: 'Silver', included_components: ['Choker', 'Top', 'Skirt'] },
    keyword_roles: { primary: [{ keyword: 'metallic top and skirt set' }] },
  });
  assert.equal(
    result.issues.some((issue) => issue.code === 'meta_description_repeats_deterministic_composition'),
    false,
  );
});

test('keeps the live black, red, and silver review repairs commercially clean', () => {
  const controls = [
    {
      context: {
        product_truth: { color: 'Black', included_components: ['Bodysuit', 'Leg Covers', 'Tail'] },
        manual_focus: { event: ['halloween', 'cosplay'], style: ['goth', 'fantasy'], audience: ['women'] },
        keyword_roles: {
          primary: [{ keyword: 'halloween costume with black bodysuit' }],
          secondary: [{ keyword: 'black bodysuit halloween costume' }],
          support: [{ keyword: 'cosplay bodysuit women' }],
        },
      },
      value: {
        seo_title: 'Halloween Costume With Black Bodysuit',
        h1: 'Halloween Costume With Black Bodysuit',
        meta_description: 'Black Halloween costume with black bodysuit, featuring a smooth high-gloss finish for cosplay nights and creative photo or video shoots.',
        intro: 'This black bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive goth-fantasy look.',
        bullet_highlights: [],
        image_alt_candidates: [{ image_role: 'primary', alt_text: 'woman wearing a black bodysuit costume with leg covers and tail on a studio backdrop', truth_basis: 'visible_product_fact' }],
        pdp_blocks: [
          { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Made for Halloween and cosplay, this black costume uses a smooth, high-gloss surface to create a sleek, latex-like character. The polished finish gives the original goth-fantasy design a bold, dark presence in motion, photos, and stage lighting.' },
          { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Designed in our fashion studio, the black costume has a bold goth-fantasy character that feels distinctive and memorable.\nThe black vegan leather rests comfortably against the body, making the costume easier to wear for extended periods.\nWith careful storage, the black pieces keep their shape beautifully between wears and stay ready for future wear.' },
          { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Women drawn to an expressive black costume for live music productions.\nParty-goers seeking a dark, polished look for Halloween nights.\nCosplayers developing an original goth or fantasy character for cosplay appearances.\nLive performers choosing a dramatic outfit for stage shows or theatrical roles.\nContent creators producing Halloween shoots, music videos, or digital campaigns.' },
          { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we develop this black Halloween costume in our fashion studio, giving it a bold goth-fantasy character. Its high-gloss, latex-like finish creates a memorable look for Halloween nights, cosplay appearances, and creative photo or video shoots. The studio-created design supports confident personal style across future performances and themed events.' },
        ],
      },
    },
    {
      context: {
        product_truth: { color: 'Red', included_components: ['Forearm Covers', 'Bodysuit', 'Tail'] },
        manual_focus: { event: ['halloween', 'cosplay'], style: ['goth', 'fantasy'], persona: ['demon', 'drag queen'], audience: ['women', 'drag'] },
        keyword_roles: {
          primary: [{ keyword: 'halloween costumes with red bodysuit' }],
          secondary: [{ keyword: 'red bodysuit halloween costume' }],
          support: [{ keyword: 'red devil bodysuit' }],
        },
      },
      value: {
        seo_title: 'Halloween Costumes With Red Bodysuit',
        h1: 'Halloween Costumes With Red Bodysuit',
        meta_description: 'Halloween costumes with red bodysuit styling, a smooth high-gloss finish, and a bold demon-inspired character for Halloween and cosplay.',
        intro: 'This red bodysuit costume is designed for Halloween and cosplay, where its original studio design creates a bold, distinctive demon-inspired look.',
        bullet_highlights: [],
        image_alt_candidates: [{ image_role: 'primary', alt_text: 'red demon-inspired bodysuit costume posed in profile against a studio backdrop', truth_basis: 'visible_product_fact' }],
        pdp_blocks: [
          { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'Made for Halloween and cosplay, this red bodysuit costume combines a smooth, high-gloss surface with a sleek, latex-like character. The bold fitted design looks polished in motion, while the vivid red finish gives photos and live performances a striking demon-inspired edge.' },
          { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Created by our designers, the red costume combines a dramatic demon-inspired character with a distinctive fashion-led edge.\nThe fitted vegan-leather outfit feels comfortable against the body, helping it remain wearable for extended periods.\nCareful storage helps the costume keep its shape beautifully between wears and remain ready for future shows.' },
          { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Women choosing a vivid red outfit for live music productions.\nParty-goers drawn to a demon-inspired look for Halloween nights.\nCosplayers developing an original goth or fantasy character for cosplay appearances.\nDrag performers seeking a glamorous red costume for live shows.\nContent creators producing themed shoots, music videos, or digital campaigns.' },
          { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, we create this red demon-inspired costume with a bold, glamorous fashion-led character. Its smooth high-gloss finish gives the outfit a memorable look for Halloween nights, original cosplay, drag performances, and creative photo or video shoots. The studio-created design supports confident personal expression across future shows and themed events.' },
        ],
      },
    },
    {
      context: {
        product_truth: { color: 'Silver', included_components: ['Bodysuit', 'Single Leg Cover'] },
        manual_focus: { event: ['stage', 'cosplay'], style: ['post apocalyptic', 'cyberpunk', 'sci fi'], persona: ['robot', 'performer', 'showgirl'], audience: ['women'] },
        keyword_roles: {
          primary: [{ keyword: 'robot armor costume' }],
          secondary: [{ keyword: 'silver metallic bodysuit' }, { keyword: 'sci fi armor costume' }],
          support: [{ keyword: 'robot armor cosplay' }],
        },
      },
      value: {
        seo_title: 'Silver Robot Armor Costume for Stage',
        h1: 'Silver Robot Armor Costume for Stage',
        meta_description: 'Silver robot armor costume with a metal-inspired finish for stage and cosplay, made for striking cyberpunk moments.',
        intro: 'This robot armor outfit is designed for the stage and cosplay, where its original studio design creates a bold, distinctive look.',
        bullet_highlights: [],
        image_alt_candidates: [{ image_role: 'primary', alt_text: 'silver robot armor outfit with a black harness look, standing in a studio pose', truth_basis: 'visible_product_fact' }],
        pdp_blocks: [
          { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'For stage and cosplay, this robot-inspired armor outfit creates a sleek silver bodysuit with a fashion-led metallic edge. Its smooth, high-gloss surface gives the finish a polished, metal-inspired character. The bold sci-fi styling looks striking in motion and under performance lighting.' },
          { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Developed in our fashion studio, the silver armor outfit has a distinctive sci-fi character with a polished, metal-inspired edge.\nVegan leather sits comfortably against the body, helping the armor outfit remain wearable for extended periods.\nCareful storage helps the armor outfit keep its shape beautifully between wears and stay ready for repeat wear.' },
          { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Women seeking an expressive sci-fi outfit for live music productions.\nFestival-goers choosing distinctive robot styling for long days of music and movement.\nCosplayers developing an original post-apocalyptic or cyberpunk character for cosplay appearances.\nLive performers drawn to a striking armor outfit for stage shows or theatrical roles.\nContent creators producing cyberpunk shoots, music videos, or digital campaigns.' },
          { block_key: 'main_description', placement: 'left_description', heading: 'Designed for self-expression', body: 'At TheFEYA, our designers give this silver robot armor outfit bold sci-fi styling and a high-gloss, metal-inspired finish. The distinctive, glamorous character creates a memorable look on stage, in original cosplay, and across creative photo or video shoots. Our studio design supports confident self-expression through future performances and themed productions.' },
        ],
      },
    },
  ];

  for (const control of controls) {
    const result = validateSeoCommercialCopy(control.value, control.context);
    assert.deepEqual(
      result.issues.filter((issue) => issue.severity === 'blocker').map((issue) => issue.code),
      [],
      String(control.context.product_truth.color),
    );
    assert.equal(result.issues.some((issue) => issue.code === 'self_expression_close_lacks_clear_buyer_value'), false);
    assert.equal(result.issues.some((issue) => /color_finish_mismatch|unsupported_reflective/.test(issue.code)), false);
  }
});
