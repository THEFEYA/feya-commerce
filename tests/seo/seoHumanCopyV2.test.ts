import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCurrentSeoProductEvidence,
  mapFactSheetRow,
} from '../../lib/seoProductFactSheet.ts';
import {
  buildCompactSeoWriterPrompt,
  validateSeoWriterBriefPreflight,
} from '../../lib/seoClaimPlanV2.ts';
import { generateSeoDraftWithOpenAi } from '../../lib/seoOpenAiDraftGenerator.ts';
import {
  normalizeBrownLeatherHarnessPhotoshootAlt,
  normalizePaidDanceCostumeCopy,
  normalizePaidRedSpineTailCopy,
  normalizePaidWitchCostumeCopy,
  normalizeImageAltPrimaryVariation,
  normalizeCodeOwnedPdpBlockOrder,
  normalizeCodeOwnedSeoCollections,
  normalizeMainDescriptionCliches,
  normalizeRepeatedAboutFinishClause,
  normalizeSeoEditorialCandidate,
} from '../../lib/seoEditorialCandidateSelection.ts';
import { validateSeoAgentOutput } from '../../lib/seoAgentOutputValidator.ts';
import { validateSeoCommercialCopy } from '../../lib/seoCommercialCopyValidator.ts';
import { validateSeoKeywordPlacement } from '../../lib/seoKeywordPlacementValidator.ts';

function roleMap() {
  return {
    primary: [{
      keyword: 'warrior armor costume',
      keyword_norm: 'warrior armor costume',
      role: 'primary',
      avg_monthly_searches: 100,
      competition: 'MEDIUM',
      metric_source: 'google_keyword_planner',
    }],
    secondary: [{
      keyword: 'gold shoulder armor',
      keyword_norm: 'gold shoulder armor',
      role: 'secondary',
    }],
    support: [],
    image_alt: [],
    collection: [],
    faq_commercial: [],
    hold: [],
    reject: [],
  } as any;
}

function writerWireOutput(pdpBlocks: unknown = {
  about_this_piece: 'About.',
  why_youll_love_it: 'Why.',
  ideal_for: 'Ideal.',
  main_description: 'Final.',
}) {
  return {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: null,
    h1: null,
    meta_description: null,
    intro: null,
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [],
      dna_matches: [],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: pdpBlocks,
    qa_self_report: {
      cliche_phrase: 'not_checked',
      long_dash: 'not_checked',
      keyword_stuffing: 'not_checked',
      product_specificity: 'not_checked',
      forbidden_mismatch: 'not_checked',
      similarity_cannibalization: 'not_checked',
      image_alt_truth: 'not_checked',
      commercial_placement: 'not_checked',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  };
}

test('brown photoshoot harness ALT keeps the model shirt outside sold Product DNA', () => {
  const output = {
    ...writerWireOutput([
      { block_key: 'about_this_piece', body: 'Thin about copy.' },
      { block_key: 'main_description', body: 'The piece feels bold and feels personal.' },
    ]),
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Brown leather harness worn over a white shirt by a male model',
      truth_basis: 'visible_product_fact',
    }],
  } as any;
  const normalized = normalizeBrownLeatherHarnessPhotoshootAlt(output, {
    primary_keyword: 'leather harness top',
    selected_events: ['photoshoot'],
    selected_materials: ['brown', 'leather'],
    product_color: 'Brown',
  });

  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'Brown leather chest harness worn by a male model',
  );
  assert.doesNotMatch(normalized.image_alt_candidates[0].alt_text, /shirt/i);
  assert.match(normalized.pdp_blocks[0].body, /portrait and editorial photoshoots/i);
  assert.doesNotMatch(normalized.pdp_blocks[1].body, /\bfeels\b/i);
});

test('paid red spine-tail draft is repaired without changing its accepted identity or Ideal for block', () => {
  const originalIdealFor = '- Drag performers seeking a red burlesque look for the stage.\n- Showgirls drawn to glamorous red styling for live performance.\n- Women choosing a bold theatrical outfit for productions.\n- Content creators producing striking red visuals for drag and stage sets.\n- Costume stylists selecting an original red design for editorials and shows.';
  const output = {
    ...writerWireOutput([
      {
        block_key: 'about_this_piece',
        body: 'Built for stage and drag, this red stage costume centers a sculptural spine-tail that reads clearly in motion and from behind. The smooth red surface has a high-gloss finish that keeps the sculptural details visible under stage lighting. With careful storage, the backpiece keeps its shape between wears and stays ready for repeat use.',
      },
      {
        block_key: 'why_youll_love_it',
        body: '- Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\n- The smooth high-gloss red finish keeps the sculptural details visible under stage lighting.\n- With careful storage, the sculptural backpiece keeps its shape between wears and stays ready for repeat use.',
      },
      { block_key: 'ideal_for', body: originalIdealFor },
      {
        block_key: 'main_description',
        body: 'We designed this piece for performers who want red that commands attention from the first glance. At TheFEYA, our fashion studio shaped the red stage costume to feel bold, distinctive, and memorable in drag and stage settings. We kept the line dramatic and the presence unmistakably personal, so the finish reads with confidence under lights. We wanted it to feel like a statement that stays with the audience long after the music stops.',
      },
    ]),
    seo_title: 'Red Stage Outfit',
    intro: 'Designed for the stage and drag, this red stage costume brings an original studio edge to performers who want a bold, distinctive presence.',
  } as any;

  const normalized = normalizePaidRedSpineTailCopy(output, {
    primary_keyword: 'red stage outfit',
    selected_events: ['stage', 'drag'],
    selected_materials: ['red'],
    product_color: 'Red',
  });

  assert.equal(normalized.seo_title, 'Red Stage Outfit');
  assert.doesNotMatch(normalized.intro, /distinctive presence/i);
  assert.match(normalized.pdp_blocks[0].body, /spine and flows into a tail below the waist/i);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /\btop\b|\bskirt\b/i);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /glossy|between wears/i);
  assert.match(normalized.pdp_blocks[1].body, /glossy finish/i);
  assert.match(normalized.pdp_blocks[1].body, /between wears/i);
  assert.equal(normalized.pdp_blocks[2].body, originalIdealFor);
  assert.match(normalized.pdp_blocks[3].body, /personal expression/i);
});

test('paid dance draft keeps fabric as the base and leather only in selected gold details', () => {
  const output = {
    ...writerWireOutput([
      {
        block_key: 'about_this_piece',
        body: 'Built for stage presence, this dance outfit for ladies pairs a stretch-fabric base with selected patterns and details in gold mirror-finish vegan leather. The black-and-gold finish creates a striking, polished contrast that reads clearly under performance lighting.',
      },
      {
        block_key: 'why_youll_love_it',
        body: '- Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\n- The stretch-fabric base moves comfortably through dance turns and stage choreography.\n- Gold mirror-finish details catch available stage light, helping the decorative pattern stay visible during performance.\n- Careful storage helps the costume keep its shape between wears for repeat stage use.',
      },
      {
        block_key: 'ideal_for',
        body: '- Dancers performing in a stretch-fabric costume for live stage choreography.\n- Dance schools outfitting groups in a recognizable black-and-gold design.\n- Show ballets selecting black-and-gold costumes for ensemble stage productions.\n- Go-go dancers choosing a flexible costume for energetic stage performance.\n- Event organizers sourcing distinctive dance costumes for professional show teams.',
      },
      {
        block_key: 'main_description',
        body: 'We designed this piece for performers who want a bold stage impression with clean, futuristic glam energy. TheFEYA brings our original design ideas to a dance outfit for ladies that feels powerful, graphic, and memorable. We shaped it for women who want their performance wear to stand out with black-and-gold intensity. We made it to read like a character of its own: sharp, confident, and unforgettable.',
      },
    ]),
    seo_title: 'Gold Dance Costume For Ladies for Stage',
    h1: 'Gold Dance Costume For Ladies for Stage',
    meta_description: 'Black dance costume for ladies with a gold finish and stage-ready glam for stage shows.',
    intro: 'For stage work, this dance outfit for ladies brings a bold, original studio design that feels made for movement and command.',
  } as any;

  const normalized = normalizePaidDanceCostumeCopy(output, {
    primary_keyword: 'dance costume for ladies',
    selected_events: ['stage'],
    selected_materials: ['gold', 'black', 'fabric'],
  });

  assert.match(normalized.seo_title, /Stage Performance Set/);
  assert.doesNotMatch(normalized.seo_title, /for ladies for stage/i);
  assert.match(normalized.pdp_blocks[0].body, /black-and-gold dance costume/i);
  assert.match(normalized.pdp_blocks[0].body, /stretch-fabric base/i);
  assert.match(normalized.pdp_blocks[0].body, /details made from gold mirror-finish vegan leather/i);
  assert.doesNotMatch(normalized.intro, /dance costume for ladies/i);
  assert.match(normalized.intro, /dance outfit for ladies/i);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /dance costume for ladies/i);
  assert.match(normalized.pdp_blocks[1].body, /gold finish catches stage light/i);
  assert.match(normalized.pdp_blocks[1].body, /details remain visible/i);
  assert.match(normalized.pdp_blocks[2].body, /Women choosing/i);
  assert.equal((normalized.pdp_blocks[2].body.match(/\bstage\b/gi) || []).length, 1);
  assert.match(normalized.pdp_blocks[2].body, /futuristic styling/i);
  assert.match(normalized.pdp_blocks[3].body, /personal expression/i);
});

test('paid witch draft keeps witch as natural copy and completes the studio close', () => {
  const output = {
    ...writerWireOutput([
      {
        block_key: 'about_this_piece',
        body: 'For Halloween and cosplay, this black bodysuit Halloween outfit brings a sleek, latex-like appearance to a black bodysuit Halloween outfit made for dramatic entrances. The smooth, high-gloss black surface gives the look a polished edge that reads bold, dark, and unmistakably stylish.',
      },
      {
        block_key: 'why_youll_love_it',
        body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
      },
      {
        block_key: 'ideal_for',
        body: 'Women seeking a dark witch costume for Halloween appearances.\nCosplayers developing an original witch character with glamorous fantasy styling.\nLive performers wearing a bold dark-fantasy costume for themed productions.\nContent creators producing witch-inspired Halloween photos and videos.\nCostume stylists selecting an original black design for fantasy editorials.',
      },
      {
        block_key: 'main_description',
        body: 'Our original design ideas lean into glam fantasy energy, creating a dark-fantasy look that owns the room with confidence.',
      },
    ]),
    intro: 'For Halloween, this black bodysuit Halloween outfit gives women a bold fashion-led take on a witch queen look with glossy drama and easy stage presence.',
  } as any;

  const normalized = normalizePaidWitchCostumeCopy(output, {
    primary_keyword: 'black bodysuit halloween costume',
    selected_events: ['halloween', 'cosplay'],
    selected_styles: ['glam', 'fantasy'],
  });

  assert.match(normalized.intro, /black bodysuit outfit/i);
  assert.match(normalized.pdp_blocks[0].body, /witch-queen character/i);
  assert.equal((normalized.pdp_blocks[2].body.match(/\bwitch\b/gi) || []).length, 1);
  assert.equal((normalized.pdp_blocks[2].body.match(/\bfantasy\b/gi) || []).length, 1);
  assert.match(normalized.pdp_blocks[2].body, /Women choosing/i);
  assert.match(normalized.pdp_blocks[3].body, /At TheFEYA, our designers developed/i);
  assert.match(normalized.pdp_blocks[3].body, /personal expression/i);
  assert.ok(normalized.pdp_blocks[3].body.trim().split(/\s+/).length >= 45);
});

test('paid configurable witch set reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    ...writerWireOutput([
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'For Halloween and cosplay, this bodysuit Halloween outfit brings a bold, body-conscious presence with a dark witch mood. The smooth, high-gloss black surface creates a sleek, latex-like appearance. A Halloween headpiece adds height and drama for a striking stage impression.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: '- Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\n- The material feels comfortable against the body, making the garment easier to wear for extended periods.\n- With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: '- Women seeking an expressive outfit for a live music production.\n- Festival-goers drawn to a queen look for a long day of music and movement.\n- Cosplayers creating an original glam or goth character for cosplay appearances or themed productions.\n- Content creators producing goth visuals for Halloween shoots or music videos.\n- Costume stylists selecting an original glam design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'Our fashion studio gave the body-conscious form a dark witch mood that reads clearly from the first glance. We wanted a piece that feels personal while carrying a confident, queen-like presence. The result is a gothic statement with a sharp sense of occasion.',
        needs_human_review: false,
      },
    ]),
    seo_title: 'Black Bodysuit Halloween Costume',
    h1: 'Black Bodysuit Halloween Costume',
    meta_description: 'Black bodysuit Halloween costume with a sleek finish for Halloween cosplay and dramatic stage moments.',
    intro: 'For Halloween and cosplay, this bodysuit Halloween outfit gives women a fashion-led glam queen edge with a bold, black finish that feels made for the spotlight.',
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Black bodysuit Halloween outfit with a glossy crown headpiece posed against a purple studio backdrop',
      truth_basis: 'visible_product_fact',
    }],
    visual_truth: {
      observed_product_facts: [
        'Black glossy crown-style headpiece with pointed spikes',
        'Black bodysuit with sculpted fitted panels',
        'Dark cape-like shoulder pieces',
      ],
      dna_matches: ['glam gothic mood', 'fantasy queen presence'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: ['Exact material composition cannot be confirmed from the image alone'],
      forbidden_visual_claims: ['Do not claim a named character replica'],
    },
  } as any;
  const context = {
    product_truth: {
      color: 'Black',
      material: 'Fabric, Leather, Faux leather, Latex',
      known_components: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
      included_components: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
      sellable_offer_components: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
      sellable_offer: {
        status: 'ready',
        source_available: true,
        component_labels: ['Bodysuit', 'Fabric Cape', 'Headpiece', 'Garters'],
      },
    },
    manual_focus: {
      material: ['black', 'leather'],
      event: ['halloween', 'cosplay'],
      style: ['glam', 'goth', 'fantasy'],
      persona: ['queen', 'witch'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'bodysuit halloween costume', keyword_norm: 'bodysuit halloween costume', role: 'primary' }],
      secondary: [
        { keyword: 'halloween headpiece', keyword_norm: 'halloween headpiece', role: 'secondary' },
        { keyword: 'witch headpiece', keyword_norm: 'witch headpiece', role: 'secondary' },
        { keyword: 'halloween costume with black bodysuit', keyword_norm: 'halloween costume with black bodysuit', role: 'secondary' },
        { keyword: 'black bodysuit halloween costume', keyword_norm: 'black bodysuit halloween costume', role: 'secondary' },
        { keyword: 'black bodysuit halloween', keyword_norm: 'black bodysuit halloween', role: 'secondary' },
        { keyword: 'black bodysuit cosplay', keyword_norm: 'black bodysuit cosplay', role: 'secondary' },
        { keyword: 'black bodysuit costume women', keyword_norm: 'black bodysuit costume women', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'bodysuit halloween costume',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: context.manual_focus.material,
    included_components: context.product_truth.included_components,
    body_identity_variant: 'bodysuit Halloween outfit',
    product_color: 'Black',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(commercial.issues.length, 0, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(normalized.seo_title, 'Bodysuit Halloween Costume for Women');
  assert.match(normalized.pdp_blocks[0].body, /queen-like profile/i);
  assert.match(normalized.pdp_blocks[3].body, /At TheFEYA, our designers developed/i);
});

function inputContract() {
  return {
    contract_version: 'seo_agent_input_v1',
    task: 'draft_product_seo_pack',
    language: 'en-US',
    brand: 'TheFEYA',
    canonical_product_id: 'd42b9d73-1327-49fa-bfab-9a732b133772',
    matched_etsy_listing_id: '4340584466',
    product: {
      canonical_product_id: 'd42b9d73-1327-49fa-bfab-9a732b133772',
      matched_etsy_listing_id: '4340584466',
      title: 'Gold Warrior Armor Set',
      slug: 'gold-warrior-armor-set',
      material: 'vegan leather',
      color: 'gold',
      known_components: ['Shoulders', 'Skirt'],
      included_components: ['Shoulders', 'Skirt'],
      legacy_product_truth_included_components: ['Shoulders', 'Skirt', 'Bracelets'],
      source_description_fragment: 'Legacy copy says Bracelets and rush orders.',
      primary_image_alt: 'Model wearing Bracelets and a Harness Top',
      source_variations: [{ value: 'Bracelets' }],
      option_price_rows: [{ value: 'Harness Top' }],
      sellable_offer: {
        contract_version: 'storefront_sellable_offer_v1',
        status: 'ready',
        source: 'storefront_v4_configurations',
        source_available: true,
        atomic_options: [
          { configuration_id: 'shoulders', code: 'shoulders', family: 'shoulders', label: 'Shoulders', sort_order: 1, is_aggregate: false, member_codes: [], member_labels: [], mapping_source: 'atomic' },
          { configuration_id: 'skirt', code: 'skirt', family: 'skirt', label: 'Skirt', sort_order: 2, is_aggregate: false, member_codes: [], member_labels: [], mapping_source: 'atomic' },
        ],
        aggregate_options: [
          { configuration_id: 'full-set', code: 'full_set', family: null, label: 'Full Set', sort_order: 3, is_aggregate: true, member_codes: ['shoulders', 'skirt'], member_labels: ['Shoulders', 'Skirt'], mapping_source: 'complete_current_selector' },
        ],
        component_codes: ['shoulders', 'skirt'],
        component_families: ['shoulders', 'skirt'],
        component_labels: ['Shoulders', 'Skirt'],
        default_configuration_code: 'full_set',
        default_included_components: ['Shoulders', 'Skirt'],
        blockers: [],
        signature: 'offer-signature',
      },
    },
    manual_focus: {
      event: ['Burning Man', 'festival'],
      persona: ['warrior', 'performer'],
      material: ['gold'],
      keyword_selection_signature: 'internal-signature-not-for-writer',
    },
    keyword_roles: roleMap(),
    metrics_status: { status: 'validated', validated_count: 2, missing_metric_count: 0, note: 'test' },
    qa_contract: { must_check: [] },
    blocked_words: {
      product_specific_exclusions: [],
      global_blacklist_note: ['NEVER EVER HUGE LEGACY BAN'],
    },
    allowed_output_fields: [],
  } as any;
}

test('legacy view flags remain non-publishable candidates', () => {
  const mapped = mapFactSheetRow({
    canonical_product_id: 'product-1',
    matched_etsy_listing_id: '1885178663',
    card_title: 'Legacy title',
    canonical_material: 'Faux leather',
    canonical_color: null,
    raw_variation_1_name: 'Options',
    raw_variation_1_values: 'Harness Top, Bracelets',
    raw_variation_2_name: null,
    raw_variation_2_values: null,
    raw_kit_includes_section: 'Kit includes Bracelets',
    fact_adjustable_straps: false,
    fact_lightweight: false,
    fact_handmade: true,
    fact_custom_sizing: false,
    fact_engraving_option: true,
    fact_rush_orders: true,
    fact_gift_packaging: true,
    fact_pieces_sold_separately: false,
  });

  assert.deepEqual(mapped.current_confirmed_facts, []);
  assert.ok(mapped.legacy_candidate_facts.some((fact) => fact.fact_code === 'engraving_option'));
  assert.ok(mapped.legacy_candidate_facts.some((fact) => fact.fact_code === 'rush_orders'));
  assert.ok(mapped.legacy_candidate_facts.some((fact) => fact.fact_code === 'gift_packaging'));
  assert.ok(mapped.legacy_candidate_facts.every((fact) => !fact.publishable));
});

test('owner-reviewed batch products receive complete, product-specific writer claims', () => {
  const cases = [
    {
      id: 'de38a842-37c4-40a7-86b4-393341c4c9aa',
      title: 'Deluxe Brown Leather Harness for Men',
      material: 'Leather',
      color: 'Brown',
      components: ['Harness Top'],
      primary: 'leather harness top',
      focus: { material: ['brown', 'leather'], event: ['photoshoot'], style: ['classic'], audience: ['men'] },
      about: 'brown_leather_harness_identity',
      why: ['original_authorial_design', 'leather_harness_repeat_wear', 'leather_harness_upper_body_framing'],
      portrait: 'photographers',
    },
    {
      id: 'f473fb62-0440-473c-a7fb-a52dccafebc6',
      title: 'Red Burlesque Dress with Spine-Tail',
      material: null,
      color: 'Red',
      components: ['Top', 'Skirt'],
      primary: 'red stage outfit',
      focus: { material: ['red'], event: ['stage', 'drag'], style: ['glam', 'burlesque'], persona: ['drag queen', 'performer'], audience: ['women'] },
      about: 'spine_tail_continuous_backpiece',
      why: ['original_authorial_design', 'red_gloss_stage_visibility', 'spine_tail_shape_retention'],
      portrait: 'drag performers',
    },
    {
      id: 'ffa74da5-c2e1-4c3a-b460-50d1aae09f56',
      title: 'Exclusive Dance Costume Set',
      material: 'Fabric',
      color: 'Black and Gold',
      components: ['Bodysuit', 'Leg Covers'],
      primary: 'dance costume for ladies',
      focus: { material: ['black', 'gold', 'fabric'], event: ['stage'], style: ['futuristic', 'glam'], persona: ['dancer', 'performer', 'showgirl', 'go go dancer'], audience: ['women'] },
      about: 'stretch_fabric_gold_detail_construction',
      why: ['original_authorial_design', 'stretch_fabric_dance_movement', 'gold_detail_stage_visibility'],
      portrait: 'dance schools',
    },
  ];

  cases.forEach((current) => {
    const input = inputContract();
    input.canonical_product_id = current.id;
    input.product = {
      ...input.product,
      title: current.title,
      material: current.material,
      color: current.color,
      sellable_offer: {
        ...input.product.sellable_offer,
        status: 'ready',
        component_labels: current.components,
      },
    };
    input.manual_focus = { ...input.manual_focus, ...current.focus };
    input.keyword_roles.primary = [{
      ...input.keyword_roles.primary[0],
      keyword: current.primary,
      keyword_norm: current.primary,
    }];

    const { evidence, brief, preflight } = buildCompactSeoWriterPrompt(input);
    const aboutClaims = brief.claim_plan.claims.filter((claim) => claim.target_block === 'about_this_piece');
    const whyClaims = brief.claim_plan.claims.filter((claim) => claim.target_block === 'why_youll_love_it');

    assert.deepEqual(brief.claim_plan.blockers, [], current.id);
    assert.equal(aboutClaims[0]?.fact_code, current.about, current.id);
    assert.deepEqual(whyClaims.map((claim) => claim.fact_code), current.why, current.id);
    assert.ok(brief.ideal_for_portraits.some((portrait) => portrait.person === current.portrait), current.id);
    assert.ok(evidence.current_confirmed_facts.some((fact) => fact.fact_code === current.about), current.id);
    assert.equal(preflight.ok, true, JSON.stringify(preflight.issues));
  });
});

test('writer brief uses current offer and excludes raw legacy wording', () => {
  const input = inputContract();
  const evidence = buildCurrentSeoProductEvidence(input);
  const { prompt, brief, preflight } = buildCompactSeoWriterPrompt(input, {
    readiness: { mode: 'READY_FULL', allowed_customer_sections: ['intro'], suppressed_customer_sections: [] },
    primaryImageUrl: 'https://example.com/product.jpg',
  });

  assert.deepEqual(brief.product_context.confirmed_component_labels, ['Shoulders', 'Skirt']);
  assert.ok(evidence.legacy_candidate_facts.length >= 3);
  assert.equal(prompt.user_prompt.includes('Legacy copy says Bracelets'), false);
  assert.equal(prompt.user_prompt.includes('Harness Top'), false);
  assert.equal(prompt.user_prompt.includes('"Bracelets"'), false);
  assert.equal(prompt.user_prompt.includes('Model wearing Bracelets'), false);
  assert.equal(prompt.user_prompt.includes('internal-signature-not-for-writer'), false);
  assert.equal(prompt.user_prompt.includes('NEVER EVER HUGE LEGACY BAN'), false);
  assert.equal(prompt.user_prompt.includes('offer-signature'), false);
  assert.equal(prompt.user_prompt.includes('configuration_id'), false);
  assert.equal(prompt.user_prompt.includes('avg_monthly_searches'), false);
  assert.equal(prompt.user_prompt.includes('metric_source'), false);
  assert.equal(prompt.user_prompt.includes('current_confirmed_writer_facts'), false);
  assert.equal(prompt.user_prompt.includes('excluded_legacy_evidence'), false);
  assert.equal(prompt.user_prompt.includes('forbidden_claims'), false);
  assert.equal(prompt.user_prompt.includes('Full Set'), false);
  assert.equal(prompt.user_prompt.includes('available separately or together'), false);
  assert.equal(prompt.user_prompt.includes('current_purchase_flexibility'), false);
  assert.ok(prompt.user_prompt.includes('Shoulders'));
  assert.ok(prompt.user_prompt.includes('Skirt'));
  const compactPromptChars = prompt.system_prompt.length + prompt.user_prompt.length;
  assert.ok(compactPromptChars < 9_000, `compact prompt is ${compactPromptChars} characters`);
  assert.equal(brief.claim_plan.family_profile, 'multi_component_outfit');
  assert.equal(brief.claim_plan.body_identity_variant_en, 'warrior armor outfit');
  assert.match(brief.claim_plan.buyer_job_en, /^This warrior armor outfit is (?:made|designed) for /);
  assert.equal(brief.claim_plan.buyer_job_en.startsWith('Help '), false);
  assert.deepEqual(brief.claim_plan.blockers, []);
  assert.equal(brief.claim_plan.claims.filter((claim) => claim.target_block === 'about_this_piece').length, 1);
  assert.ok(brief.claim_plan.claims.filter((claim) => claim.target_block === 'why_youll_love_it').length >= 3);
  assert.equal(/unsupported|invented/i.test(brief.claim_plan.buyer_job_en), false);
  assert.ok(brief.ideal_for_portraits.some((portrait) => /Burning Man attendees|festival-goers/i.test(portrait.person)));
  assert.ok(brief.ideal_for_portraits.some((portrait) => /live performers/i.test(portrait.person)));
  assert.ok(brief.ideal_for_portraits.some((portrait) => portrait.person === 'costume stylists'));
  assert.equal(
    brief.ideal_for_portraits.some((portrait) => portrait.person === 'costume stylists' && /\bcostume\b/i.test(portrait.situation)),
    false,
  );
  assert.equal(brief.contract_version, 'seo_writer_brief_v4');
  assert.equal(preflight.ok, true, JSON.stringify(preflight.issues));
  assert.equal(brief.editorial_reference, 'seo_editorial_memory_v6');
  assert.match(prompt.system_prompt, /Meta: one normal sentence, never ALL CAPS or Title Case/);
  assert.doesNotMatch(prompt.system_prompt, /Meta is one uppercase sentence/);
  assert.match(prompt.system_prompt, /POSITIVE INTRO FRAME/);
  assert.match(prompt.system_prompt, /POSITIVE ABOUT FRAME/);
  assert.match(prompt.system_prompt, /exactly one image_alt_candidate/);
  assert.match(prompt.system_prompt, /What’s Included owns (?:inventory|that inventory|the product-parts list)/);
  assert.equal(prompt.system_prompt.includes('Made for festivals, cosplay and live performance, this warrior costume'), false);
  assert.equal(/owner[- ]approved|story confirms?|\bconfirmed\b/i.test(prompt.user_prompt), false);
  assert.equal(/independent (?:design )?(?:team|studio)/i.test(prompt.system_prompt), false);
  assert.ok(brief.code_owned_sections.includes('whats_included'));
  assert.ok(brief.code_owned_sections.includes('right_panel'));
  assert.match(prompt.system_prompt, /About this piece: 45-60 words in 2-3/);
  assert.match(prompt.system_prompt, /final main_description\/left_description block/);
  assert.match(prompt.system_prompt, /family_profile is internal/);
  assert.match(prompt.system_prompt, /For “festivals and cosplay”, add no character padding/);
  assert.match(prompt.system_prompt, /Designed for self-expression is the final main_description\/left_description block: 45-75 words, 3-4/);
  assert.match(prompt.system_prompt, /distinctive, memorable character that feels personal/);
  assert.match(prompt.system_prompt, /reflective-inspired or sparkling-inspired/);
  assert.match(prompt.system_prompt, /never call the material reflective/);
  assert.match(prompt.system_prompt, /visual_truth\.open_style_suggestions as empty arrays/);
  assert.doesNotMatch(prompt.system_prompt, /End with one plain styling sentence/);
  assert.match(prompt.system_prompt, /Return bullet_highlights, faq, internal_linking_hints and visual_truth\.open_style_suggestions as empty arrays/);
  assert.match(prompt.system_prompt, /buyer_outcome_en is ready for customer copy/);
  assert.match(prompt.system_prompt, /body_identity_variant_en.*never product_identity_en/);
});

test('compact writer brief carries a general audience into Ideal for and forbids taxonomy prose', () => {
  const input = inputContract();
  input.manual_focus = {
    event: ['festival'],
    style: ['glam', 'futuristic'],
    persona: ['warrior'],
    audience: ['women'],
    material: ['gold'],
  };

  const { brief, prompt } = buildCompactSeoWriterPrompt(input);
  assert.ok(brief.ideal_for_portraits.some((portrait) => (
    portrait.person === 'women'
    && /live music production/i.test(portrait.situation)
  )));
  assert.match(prompt.system_prompt, /any focus value appears at most twice/i);
  assert.match(prompt.system_prompt, /never say [“\"]style pair[”\"]/i);
  assert.match(prompt.system_prompt, /never recap two components/i);
});

test('compact writer contract stays product-specific for a single dress', () => {
  const input = structuredClone(inputContract());
  input.product.title = 'Black Festival Dress';
  input.product.slug = 'black-festival-dress';
  input.product.material = 'fabric';
  input.product.color = 'black';
  input.product.known_components = ['Dress'];
  input.product.included_components = ['Dress'];
  input.product.legacy_product_truth_included_components = [];
  input.product.source_description_fragment = null;
  input.product.source_variations = [];
  input.product.option_price_rows = [];
  input.product.sellable_offer = {
    ...input.product.sellable_offer,
    atomic_options: [{ configuration_id: 'dress', code: 'dress', family: 'dress', label: 'Dress', sort_order: 1, is_aggregate: false, member_codes: [], member_labels: [], mapping_source: 'atomic' }],
    aggregate_options: [],
    component_codes: ['dress'],
    component_families: ['dress'],
    component_labels: ['Dress'],
    default_configuration_code: 'dress',
    default_included_components: ['Dress'],
    signature: 'dress-offer-signature',
  };
  input.keyword_roles = roleMap();
  input.keyword_roles.primary[0].keyword = 'black festival dress';
  input.keyword_roles.primary[0].keyword_norm = 'black festival dress';
  input.keyword_roles.secondary = [];
  input.manual_focus = { event: ['festival'], audience: ['performer'] };

  const { prompt, brief } = buildCompactSeoWriterPrompt(input);
  assert.equal(brief.claim_plan.family_profile, 'single_component');
  assert.equal(brief.claim_plan.body_identity_variant_en, 'festival dress in black');
  assert.equal(brief.claim_plan.body_identity_variant_en.includes('black festival dress'), false);
  assert.ok(brief.claim_plan.blockers.includes('claim_plan_insufficient_distinct_why_claims'));
  assert.deepEqual(brief.product_context.confirmed_component_labels, ['Dress']);
  assert.equal(prompt.user_prompt.includes('Shoulders'), false);
  assert.equal(prompt.user_prompt.includes('Skirt'), false);
  assert.equal(prompt.user_prompt.includes('warrior armor costume'), false);
  assert.ok(prompt.user_prompt.includes('black festival dress'));
});

test('cosplay focus is framed as an original studio character, not a replica promise', () => {
  const input = inputContract();
  input.manual_focus = {
    ...input.manual_focus,
    event: ['festival', 'cosplay'],
    style: ['futuristic', 'fantasy'],
    persona: ['warrior', 'performer'],
  };

  const { brief, prompt } = buildCompactSeoWriterPrompt(input);
  assert.match(brief.cosplay_positioning || '', /original studio interpretation/i);
  assert.match(brief.cosplay_positioning || '', /character of their own/i);
  assert.ok(brief.ideal_for_portraits.some((portrait) => (
    portrait.person === 'cosplayers'
    && /creating an original futuristic or fantasy character/i.test(portrait.situation)
    && /cosplay appearances or themed productions$/i.test(portrait.situation)
  )));
  const portraitBrief = JSON.stringify(brief.ideal_for_portraits).toLowerCase();
  assert.equal((portraitBrief.match(/futuristic/g) || []).length <= 2, true);
  assert.equal((portraitBrief.match(/fantasy/g) || []).length <= 2, true);
  assert.equal((portraitBrief.match(/warrior/g) || []).length <= 2, true);
  assert.equal(/costume buyer|customer/.test(portraitBrief), false);
  assert.equal((portraitBrief.match(/\bplanning\b/g) || []).length, 0);
  assert.equal(/studio-designed costume/.test(portraitBrief), false);
  assert.equal(/exact replica|screen[- ]accurate|franchise replica/i.test(prompt.user_prompt), false);
});

test('code-owned PDP collections stay empty before deterministic validation', () => {
  const normalized = normalizeCodeOwnedSeoCollections({
    bullet_highlights: ['Duplicate finish benefit'],
    faq: [{ question: 'Duplicate right-panel question' }],
    internal_linking_hints: [{ anchor: 'Invented link' }],
    generation_notes: [],
  });

  assert.deepEqual(normalized.bullet_highlights, []);
  assert.deepEqual(normalized.faq, []);
  assert.deepEqual(normalized.internal_linking_hints, []);
  assert.match(normalized.generation_notes[0], /Deterministic PDP normalization/);
});

test('positive one-pass field pattern passes the same deterministic gates as the runtime', () => {
  const input = inputContract();
  input.manual_focus = {
    ...input.manual_focus,
    event: ['festival', 'cosplay'],
    style: ['futuristic', 'fantasy'],
    persona: ['warrior', 'performer'],
  };
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Festival Warrior Armor Costume for Cosplay',
    h1: 'Gold Festival Warrior Armor Costume for Cosplay',
    meta_description: 'Warrior armor costume for festival wear, stage performance and original cosplay, with a glossy gold finish and a futuristic character.',
    intro: 'This gold warrior armor outfit is made for festivals, live performance and original cosplay, giving you a complete futuristic character that feels personal.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior outfit with shoulder armor and skirt worn outdoors',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Gold shoulder pieces and a skirt are visible.'],
      dna_matches: ['Gold festival styling'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'Made for festivals, original cosplay and live performance, this gold warrior armor outfit creates a complete futuristic character. Its glossy, mirror-like coating gives the costume the shine of polished metal and carries a consistent finish across the design. It works especially well for fantasy and science-fiction roles developed around the wearer’s own idea.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: '- Our original studio design gives you a warrior character that feels personal.\n- The material feels comfortable against the body, making the costume easier to wear through a long festival day.\n- It keeps its shape between wears, so the costume is ready for the next performance after careful storage.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: '- Festival-goers planning a gold warrior look for a full day of music and movement.\n- Cosplayers creating a futuristic or fantasy character of their own through a studio interpretation.\n- Live performers preparing a warrior costume for a stage show or theatrical role.\n- Content creators styling a distinctive festival costume for shoots and music videos.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. We develop every costume in our studio, giving each idea its own recognizable character. This gold armor outfit brings that approach to futuristic warrior styling for festivals, performances and original cosplay. You can make the finished look your own.',
        source_basis: 'brand_policy',
        needs_human_review: false,
      },
    ],
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
  } as any;
  const context = {
    product_truth: input.product,
    manual_focus: input.manual_focus,
    keyword_roles: input.keyword_roles,
  };

  const structural = validateSeoAgentOutput(candidate);
  const commercial = validateSeoCommercialCopy(candidate, context);
  const keyword = validateSeoKeywordPlacement(candidate, {
    product_truth: input.product,
    keyword_roles: input.keyword_roles,
  } as any);
  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
});

test('zero-cost normalization recovers the exact final control-run copy without hiding a QA issue', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Warrior Armor Costume for Festivals',
    h1: 'Gold Warrior Armor Costume for Festivals',
    meta_description: 'Gold warrior armor costume with a glossy, mirror-like coating for festivals and cosplay.',
    intro: 'This warrior armor outfit is made for festivals and cosplay, giving you a starting point for an original futuristic or fantasy character.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior armor outfit with a headpiece, shoulder armor and leg covers posed on dark rocks',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Gold headpiece', 'Gold shoulder armor', 'Gold leg covers'],
      dna_matches: ['Futuristic gold armor styling', 'Fantasy warrior look'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'For festivals and cosplay, this warrior armor outfit brings a bold gold look with a durable, glossy, mirror-like coating. The glossy, mirror-like surface gives the costume a polished metal finish, so your character reads as striking from the first glance.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: '- Our original studio design lets you shape the finished character through your own styling choices.\n- The material feels comfortable against the body, making the costume easier to wear through longer events or performances.\n- The material helps the costume keep its shape between wears, so it is ready for the next occasion.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: '- Festival-goers planning a warrior look for a long day of music and movement.\n- Cosplayers building an original futuristic or fantasy character around a studio-designed costume.\n- Live performers preparing a warrior look for a stage show or theatrical role.\n- Content creators planning fantasy visuals for festival shoots or music videos.\n- Costume stylists sourcing an original futuristic piece for themed shows or editorials.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built to support an original futuristic or fantasy character. The gold body identity works beautifully for festival scenes, while you choose the surrounding styling. Finish it your way and make the look your own.',
        source_basis: 'brand_policy',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'not_checked',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Gold',
      included_components: ['Headpiece', 'Leg Covers', 'Shoulders', 'Top'],
    },
    manual_focus: {
      event: ['festival', 'cosplay'],
      style: ['futuristic', 'fantasy'],
      persona: ['warrior', 'performer'],
    },
    keyword_roles: roleMap(),
  } as any;
  const normalized = normalizeMainDescriptionCliches(
    normalizeRepeatedAboutFinishClause(candidate),
    {
      selected_events: context.manual_focus.event,
      selected_styles: context.manual_focus.style,
      body_identity_variant: 'warrior armor outfit',
      product_color: 'Gold',
    },
  );
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(
    normalized.pdp_blocks[0].body,
    'For festivals and cosplay, this warrior armor outfit brings a bold gold look with a durable, glossy, mirror-like coating. Its original studio design gives the gold outfit a distinctive, memorable character that feels confident at festivals, performances, and cosplay events.',
  );
  assert.equal(
    normalized.pdp_blocks[3].body,
    'At TheFEYA, we develop original festival and stage pieces in our studio. We designed this warrior armor outfit with expressive gold details and a distinctive futuristic character. The confident, memorable result feels personal, suits festival or cosplay, and preserves our original, fashion-led studio point of view.',
  );
  assert.doesNotMatch(JSON.stringify(normalized.pdp_blocks), /body identity|finish it your way|visual identity|silhouette|starting point|final look/i);
});

test('the 2026-08-10 live control draft passes after bounded zero-token normalization', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Warrior Armor Costume for Festivals',
    h1: 'Gold Warrior Armor Costume for Festivals',
    meta_description: 'Gold warrior armor costume with a durable, glossy, mirror-like coating and original studio design for festivals and cosplay.',
    intro: 'This warrior armor outfit is made for festivals and cosplay, giving you a starting point for an original futuristic or fantasy character.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior armor outfit posed against dark rocks',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'Gold metallic-look armor pieces',
        'Headpiece with tall pointed shapes',
        'Shoulder armor',
        'Armored leg covers',
        'Black bodysuit base',
        'Model posed in a dramatic action stance',
        'Dark rocky background',
      ],
      dna_matches: [
        'Warrior-inspired silhouette',
        'Futuristic fantasy styling',
        'Festival and cosplay ready look',
      ],
      open_style_suggestions: [
        'Pair with sleek boots or minimal accessories to keep the armor focus',
        'Style with bold makeup or a strong hairstyle for a festival or stage look',
      ],
      uncertain_or_missing_facts: [
        'Exact material composition is not visible from the image alone',
        'Whether all listed components are included cannot be confirmed from the image',
      ],
      forbidden_visual_claims: [
        'Do not claim reflective or retroreflective performance unless explicitly stated',
        'Do not claim armor-grade protection',
        'Do not claim the image shows every included component with certainty',
      ],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'For festivals and cosplay, this warrior armor outfit brings a durable, glossy, mirror-like coating that creates a polished metal look. The gold finish gives the set a bold stage presence while the fitted shape keeps the look streamlined.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: '- Our original studio design lets you shape the finished character through your own styling choices.\n- The material feels comfortable against the body, making the costume easier to wear through longer events or performances.\n- The material helps the costume keep its shape between wears, so it is ready for the next occasion.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: '- Festival-goers planning a warrior look for a long day of music and movement.\n- Cosplayers building an original futuristic or fantasy character around a studio-designed costume.\n- Live performers preparing a warrior look for a stage show or theatrical role.\n- Content creators planning fantasy visuals for festival shoots or music videos.\n- Costume stylists sourcing an original futuristic piece for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit is built as an original studio interpretation. The gold shape and futuristic lines help you create a character that feels bold on stage or at a festival. Style it with clean hair and strong makeup for a sharp look.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Gold',
      included_components: ['Headpiece', 'Leg Covers', 'Shoulders', 'Top'],
    },
    manual_focus: {
      event: ['festival', 'cosplay'],
      style: ['futuristic', 'fantasy'],
      persona: ['warrior', 'performer'],
    },
    keyword_roles: roleMap(),
  } as any;

  const rawStructural = validateSeoAgentOutput(candidate);
  assert.ok(rawStructural.issues.some((issue) => issue.code === 'main_description_contains_external_styling_advice'));
  assert.ok(rawStructural.issues.some((issue) => issue.code === 'visual_truth_contains_unsold_external_styling'));

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'warrior armor costume',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    body_identity_variant: 'warrior armor outfit',
    product_color: 'Gold',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(normalized.visual_truth.open_style_suggestions.length, 0);
  assert.doesNotMatch(normalized.meta_description, /\bdurable\b/i);
  assert.doesNotMatch(normalized.pdp_blocks[0].body, /\bdurable\b/i);
  assert.equal(
    normalized.pdp_blocks[0].body,
    'For festivals and cosplay, this warrior armor outfit uses a glossy, mirror-like coating to create a polished metal-inspired finish. The streamlined armor forms give the gold design a distinctive, recognizable character for festival days, stage performances, photos, and original cosplay styling.',
  );
  assert.match(normalized.pdp_blocks[1].body, /(?:keep(?:s)? its shape|holds its form|retains its shape exceptionally well) between wears/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /hair|makeup|footwear|accessor/i);
  assert.equal(
    normalized.pdp_blocks[3].body,
    'At TheFEYA, we develop festival and stage pieces from our own ideas. This warrior armor outfit is our original, fashion-led interpretation of a futuristic character for festivals and performance. Its expressive gold details give the design a distinctive, confident presence that feels personal and memorable while staying true to our studio style.',
  );
  assert.deepEqual(normalized.pdp_blocks.map((block: any) => block.block_key), [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ]);
});

test('the final paid Gold Warrior pilot receives the exact human-reviewed zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Warrior Armor Costume for Festivals',
    h1: 'Gold Warrior Armor Costume for Festivals',
    meta_description: 'GOLD WARRIOR ARMOR COSTUME WITH A POLISHED METAL LOOK FOR FESTIVALS AND COSPLAY.',
    intro: 'This warrior armor outfit is made for festivals and cosplay, giving you a starting point for an original futuristic or fantasy character.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior armor outfit with a raised pose on dark rocks',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Gold headpiece', 'Gold shoulder armor', 'Gold leg covers'],
      dna_matches: ['Futuristic warrior styling', 'Fantasy performance presence'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'For festivals and cosplay, this warrior armor outfit brings a striking futuristic edge to your look. Its glossy, mirror-like coating creates a polished metal look. The sculpted gold finish adds strong visual presence while keeping the overall silhouette sleek and wearable.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Our original studio design lets you shape the finished character through your own styling choices.\nThe material feels comfortable against the body, making the costume easier to wear through longer events or performances.\nThe material helps the costume keep its shape between wears, so it is ready for the next occasion.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Festival-goers planning a warrior look for a long day of music and movement.\nCosplayers building an original futuristic or fantasy character around a studio-designed costume.\nLive performers preparing a warrior look for a stage show or theatrical role.\nContent creators planning fantasy visuals for festival shoots or music videos.\nCostume stylists sourcing an original futuristic piece for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'At TheFEYA, we develop festival and stage pieces from our own ideas, and this warrior armor outfit was created to support a bold futuristic or fantasy look. It can lean futuristic or fantasy for festivals and cosplay. It feels designed for a visual identity that feels personal.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [
        'Primary keyword used once each in SEO title, H1, and meta description.',
        'Meta description kept uppercase and within length guidance.',
      ],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Gold',
      included_components: ['Headpiece', 'Leg Covers', 'Shoulders', 'Top'],
    },
    manual_focus: {
      event: ['festival', 'cosplay'],
      style: ['futuristic', 'fantasy'],
      persona: ['warrior', 'performer'],
    },
    keyword_roles: roleMap(),
  } as any;

  const rawStructural = validateSeoAgentOutput(candidate);
  const rawCodes = rawStructural.issues.map((issue) => issue.code);
  assert.ok(rawCodes.includes('meta_description_all_caps'));
  assert.ok(rawCodes.includes('main_description_repeats_selected_style_pair'));
  assert.ok(rawCodes.includes('main_description_repeats_feels'));

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'warrior armor costume',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    body_identity_variant: 'warrior armor outfit',
    product_color: 'Gold',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(
    normalized.meta_description,
    'Gold warrior armor costume with a glossy, polished-metal look for festivals, cosplay and stage performance.',
  );
  assert.equal(
    normalized.intro,
    'This gold warrior armor outfit brings a polished, futuristic studio character to festivals, cosplay, and stage performance.',
  );
  assert.equal(
    normalized.pdp_blocks[0].body,
    'A glossy, mirror-like coating gives this gold warrior armor outfit its polished, metal-inspired finish. Streamlined armor forms and expressive details give the design a distinctive, recognizable character for festival days, original cosplay, stage performance, and editorial settings.',
  );
  assert.equal(
    normalized.pdp_blocks[1].body,
    'Our original studio design gives the gold outfit a distinctive, memorable character.\nA comfortable feel against the body makes the costume easier to wear through longer events or performances.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future occasions.',
  );
  assert.equal(
    normalized.pdp_blocks[2].body,
    'Festival-goers planning a warrior look for a full day of music and movement.\nCosplayers developing an original fantasy character around a studio-designed costume.\nLive performers preparing a futuristic warrior costume for a stage show or theatrical role.\nContent creators planning a gold costume photoshoot for festival imagery.\nCostume stylists sourcing armor-inspired fashion for editorials or themed productions.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[2].body, /music videos/i);
  assert.equal(
    normalized.pdp_blocks[3].body,
    "At TheFEYA, we develop festival and stage pieces from our own ideas. This gold armor outfit reflects our fashion-led take on futuristic warrior design. Its expressive forms give the original character a confident, memorable presence that feels personal while preserving the distinctive style of our studio.",
  );
  assert.equal(
    commercial.repetition_report?.repeated_idea_groups.some((group) => (
      group.idea.startsWith('selected_style_pair_') && group.blocks.length >= 3
    )),
    false,
  );
  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'Gold warrior armor outfit with headpiece, shoulder armor and leg covers posed on dark rocks',
  );
  assert.deepEqual(normalized.qa_self_report.notes, [
    'Primary keyword used once each in SEO title, H1, and meta description.',
    'Meta description uses natural sentence case and stays within length guidance.',
  ]);
  assert.deepEqual(normalized.pdp_blocks.map((block: any) => block.block_key), [
    'about_this_piece',
    'why_youll_love_it',
    'ideal_for',
    'main_description',
  ]);
});

test('the August live pilot stays blocked for human-copy defects while ALT normalization removes the false fourth Primary', () => {
  const input = inputContract();
  input.manual_focus = {
    ...input.manual_focus,
    event: ['festival', 'cosplay'],
    style: ['futuristic', 'fantasy'],
    persona: ['warrior', 'performer'],
  };
  const pilot = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Warrior Armor Costume for Festivals',
    h1: 'Warrior Armor Costume for Festivals',
    meta_description: 'Step into a warrior armor costume with gold, futuristic styling, made for festivals and cosplay with a polished metal finish.',
    intro: 'This warrior armor outfit belongs at festivals and cosplay, where gold mirror-like finish gives the wearer a bold, character-driven look.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Gold warrior armor costume with shoulder armor and skirt on a performer posing against dark rocks',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Gold armor is visible.'],
      dna_matches: ['Warrior styling'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        body: 'This warrior armor outfit gives a festival or cosplay wearer a character-first look that feels ready for movement. The durable, glossy mirror-like coating creates a polished metal finish across the gold surfaces. That finish helps the wearer stand out with a bold presence in the spotlight.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: '• Our original studio design helps you create a character that feels personal.\n• The comfortable against the body feel makes it easier to wear through longer events or performances.\n• Keeps its shape between wears so it is ready for the next occasion.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: '• Festival-goers planning a warrior look for a long day of music and movement.\n• Cosplayers creating a character of their own through a studio interpretation inspired by a futuristic or fantasy style.\n• Live performers preparing a warrior costume for a stage show or theatrical role.\n• Content creators styling a fantasy costume for festival photography or music videos.\n• Costume stylists sourcing a futuristic design for themed shows or editorials.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal. This piece supports a bold warrior character in a futuristic or fantasy setting, whether you are heading to a festival or shaping a look for the camera. The result is a costume that feels like your own story on arrival.',
        source_basis: 'brand_policy',
        needs_human_review: false,
      },
    ],
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
  } as any;
  const normalized = normalizeImageAltPrimaryVariation(pilot, {
    primary_keyword: 'warrior armor costume',
    body_identity_variant: 'warrior armor outfit',
  });
  const context = {
    product_truth: input.product,
    manual_focus: input.manual_focus,
    keyword_roles: input.keyword_roles,
  };

  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: input.product,
    keyword_roles: input.keyword_roles,
  } as any);

  assert.ok(structural.issues.some((issue) => issue.code === 'meta_description_ai_cliche' && issue.severity === 'blocker'));
  assert.ok(commercial.issues.some((issue) => issue.code === 'customer_copy_contains_pilot_robotic_language'));
  assert.equal(keyword.issues.some((issue) => issue.code === 'primary_exact_phrase_outside_owned_fields'), false);
  assert.equal(keyword.issues.some((issue) => issue.code === 'primary_exact_phrase_overused'), false);
});

test('writer brief preflight blocks internal provenance before any paid call', () => {
  const { brief } = buildCompactSeoWriterPrompt(inputContract());
  const polluted = structuredClone(brief);
  polluted.claim_plan.claims[0].fact_statement_en = 'The owner-approved material story confirms a glossy finish.';

  const result = validateSeoWriterBriefPreflight(polluted);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some((issue) => issue.code.startsWith('writer_brief_internal_provenance_')));
});

test('PDP block order is restored by code without rewriting customer copy', () => {
  const input = {
    pdp_blocks: [
      { block_key: 'main_description', placement: 'left_description', body: 'Final.' },
      { block_key: 'about_this_piece', placement: 'left_description', body: 'About.' },
      { block_key: 'ideal_for', placement: 'left_description', body: 'Ideal.' },
      { block_key: 'why_youll_love_it', placement: 'left_description', body: 'Why.' },
    ],
    generation_notes: [],
  };

  const normalized = normalizeCodeOwnedPdpBlockOrder(input);
  assert.deepEqual(
    normalized.pdp_blocks.map((block) => block.block_key),
    ['about_this_piece', 'why_youll_love_it', 'ideal_for', 'main_description'],
  );
  assert.equal(normalized.pdp_blocks[0].body, 'About.');
  assert.match(normalized.generation_notes[0], /layout normalization/);
});

test('exact self-expression close is recovered from unambiguous model metadata error', () => {
  const input = {
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'About.' },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Why.' },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Ideal.' },
      {
        block_key: 'related_collections',
        placement: 'review_only',
        heading: 'Designed for Self-Expression',
        body: 'At TheFEYA, we create original festival and stage fashion for people who want a design that feels personal.',
      },
    ],
    generation_notes: [],
  };

  const normalized = normalizeCodeOwnedPdpBlockOrder(input);
  assert.deepEqual(
    normalized.pdp_blocks.map((block) => [block.block_key, block.placement]),
    [
      ['about_this_piece', 'left_description'],
      ['why_youll_love_it', 'left_description'],
      ['ideal_for', 'left_description'],
      ['main_description', 'left_description'],
    ],
  );
  assert.match(normalized.generation_notes.join(' '), /restored the exact Designed for self-expression close/);
});

test('ambiguous self-expression metadata remains blocked for structural QA', () => {
  const input = {
    pdp_blocks: [
      { block_key: 'about_this_piece', placement: 'left_description', heading: 'About this piece', body: 'About.' },
      { block_key: 'why_youll_love_it', placement: 'left_description', heading: 'Why you’ll love it', body: 'Why.' },
      { block_key: 'ideal_for', placement: 'left_description', heading: 'Ideal for', body: 'Ideal.' },
      { block_key: 'related_collections', placement: 'review_only', heading: 'Designed for self-expression', body: 'First.' },
      { block_key: 'related_collections', placement: 'review_only', heading: 'Designed for self-expression', body: 'Second.' },
    ],
    generation_notes: [],
  };

  assert.equal(normalizeCodeOwnedPdpBlockOrder(input), input);
});

test('OpenAI writer performs one bounded request and reports token usage', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  let calls = 0;
  let requestBody: any = null;
  try {
    const result = await generateSeoDraftWithOpenAi({
      contract_version: 'seo_agent_prompt_v1',
      model_role: 'server_side_seo_draft_writer',
      output_contract_version: 'seo_agent_output_v1',
      system_prompt: 'System contract',
      user_prompt: 'Writer brief',
      doctrine_summary: {} as any,
      response_format: { type: 'json_schema', required_top_level_fields: [] },
      guardrails: [],
    }, {
      reasoningEffort: 'low',
      timeoutMs: 500,
      maxOutputTokens: 321,
      fetchImpl: async (_url, init) => {
        calls += 1;
        requestBody = JSON.parse(String(init?.body || '{}'));
        return new Response(JSON.stringify({
          id: 'resp_test',
          output_text: JSON.stringify(writerWireOutput()),
          usage: {
            input_tokens: 120,
            output_tokens: 40,
            total_tokens: 160,
            input_tokens_details: { cached_tokens: 20 },
            output_tokens_details: { reasoning_tokens: 5 },
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    assert.equal(calls, 1);
    assert.equal(result.ok, true);
    assert.equal(requestBody.max_output_tokens, 321);
    assert.equal(requestBody.reasoning.effort, 'low');
    assert.equal(requestBody.text.format.name, 'seo_agent_writer_output_v3');
    const pdpSchema = requestBody.text.format.schema.properties.pdp_blocks;
    assert.equal(pdpSchema.type, 'object');
    assert.equal(pdpSchema.additionalProperties, false);
    assert.deepEqual(pdpSchema.required, [
      'about_this_piece',
      'why_youll_love_it',
      'ideal_for',
      'main_description',
    ]);
    assert.deepEqual(Object.keys(pdpSchema.properties), pdpSchema.required);
    assert.equal('whats_included' in pdpSchema.properties, false);
    assert.equal('material' in pdpSchema.properties, false);
    assert.equal(
      requestBody.text.format.schema.properties.visual_truth.properties.open_style_suggestions.maxItems,
      0,
    );
    assert.deepEqual(result.output?.pdp_blocks.map((block) => ({
      key: block.block_key,
      heading: block.heading,
      placement: block.placement,
      source: block.source_basis,
      body: block.body,
    })), [
      { key: 'about_this_piece', heading: 'About this piece', placement: 'left_description', source: 'product_fact', body: 'About.' },
      { key: 'why_youll_love_it', heading: 'Why you’ll love it', placement: 'left_description', source: 'product_fact', body: 'Why.' },
      { key: 'ideal_for', heading: 'Ideal for', placement: 'left_description', source: 'product_fact', body: 'Ideal.' },
      { key: 'main_description', heading: 'Designed for self-expression', placement: 'left_description', source: 'brand_policy', body: 'Final.' },
    ]);
    assert.equal(result.telemetry.usage?.total_tokens, 160);
    assert.equal(result.telemetry.usage?.cached_input_tokens, 20);
    assert.deepEqual(result.telemetry.writer_output_block_keys, [
      'about_this_piece',
      'why_youll_love_it',
      'ideal_for',
      'main_description',
    ]);
    assert.equal(result.telemetry.writer_output_block_count, 4);
    assert.equal(result.telemetry.prompt_hash.length, 64);
    assert.equal('system_prompt' in result.telemetry, false);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test('OpenAI writer rejects the legacy one-block array response before route validation', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  let calls = 0;
  try {
    const result = await generateSeoDraftWithOpenAi({
      contract_version: 'seo_agent_prompt_v1',
      model_role: 'server_side_seo_draft_writer',
      output_contract_version: 'seo_agent_output_v1',
      system_prompt: 'System contract',
      user_prompt: 'Writer brief',
      doctrine_summary: {} as any,
      response_format: { type: 'json_schema', required_top_level_fields: [] },
      guardrails: [],
    }, {
      reasoningEffort: 'low',
      fetchImpl: async () => {
        calls += 1;
        return new Response(JSON.stringify({
          id: 'resp_incomplete_pdp',
          output_text: JSON.stringify(writerWireOutput([{
            block_key: 'main_description',
            placement: 'left_description',
            heading: 'Designed for self-expression',
            body: 'Only the final block was returned.',
            source_basis: 'brand_policy',
            needs_human_review: false,
          }])),
          usage: {
            input_tokens: 100,
            output_tokens: 20,
            total_tokens: 120,
          },
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      },
    });

    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    assert.equal(result.status, 'parse_error');
    assert.match(result.error || '', /required named-slot object contract/);
    assert.deepEqual(result.telemetry.writer_output_block_keys, ['main_description']);
    assert.equal(result.telemetry.writer_output_block_count, 1);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test('OpenAI writer aborts at its upstream limit without retry', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  let calls = 0;
  try {
    const result = await generateSeoDraftWithOpenAi({
      contract_version: 'seo_agent_prompt_v1',
      model_role: 'server_side_seo_draft_writer',
      output_contract_version: 'seo_agent_output_v1',
      system_prompt: 'System contract',
      user_prompt: 'Writer brief',
      doctrine_summary: {} as any,
      response_format: { type: 'json_schema', required_top_level_fields: [] },
      guardrails: [],
    }, {
      timeoutMs: 10,
      fetchImpl: (_url, init) => new Promise((_resolve, reject) => {
        calls += 1;
        init?.signal?.addEventListener('abort', () => {
          const error = new Error('aborted');
          error.name = 'AbortError';
          reject(error);
        }, { once: true });
      }),
    });

    assert.equal(calls, 1);
    assert.equal(result.ok, false);
    assert.equal(result.status, 'upstream_timeout');
    assert.match(result.error || '', /No automatic retry/);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test('OpenAI writer timeout also bounds response body parsing', async () => {
  const previousKey = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = 'test-only-not-a-real-key';
  let calls = 0;
  try {
    const result = await generateSeoDraftWithOpenAi({
      contract_version: 'seo_agent_prompt_v1',
      model_role: 'server_side_seo_draft_writer',
      output_contract_version: 'seo_agent_output_v1',
      system_prompt: 'System contract',
      user_prompt: 'Writer brief',
      doctrine_summary: {} as any,
      response_format: { type: 'json_schema', required_top_level_fields: [] },
      guardrails: [],
    }, {
      timeoutMs: 10,
      fetchImpl: (async (_url, init) => {
        calls += 1;
        return {
          ok: true,
          status: 200,
          json: () => new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const error = new Error('aborted while reading body');
              error.name = 'AbortError';
              reject(error);
            }, { once: true });
          }),
        } as Response;
      }) as typeof fetch,
    });

    assert.equal(calls, 1);
    assert.equal(result.status, 'upstream_timeout');
    assert.equal(result.telemetry.http_status, 200);
  } finally {
    if (previousKey === undefined) delete process.env.OPENAI_API_KEY;
    else process.env.OPENAI_API_KEY = previousKey;
  }
});

test('the 2026-08-11 silver rave control draft reaches review with zero-token bounded repairs', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Rave Outfit With Skirt for Festivals',
    h1: 'Silver Rave Outfit With Skirt for Festivals',
    meta_description: 'Silver rave outfit with skirt brings a polished metal look to festivals and rave.',
    intro: 'This rave costume with skirt is made for festivals and rave, giving you an original studio look you can make your own, with a silver rave skirt feel that stands out beautifully.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'Silver rave costume with skirt worn at a festival stage',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Silver shoulder pieces and a matching skirt are visible.'],
      dna_matches: ['Silver festival styling'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [],
      forbidden_visual_claims: [],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'For festivals and rave, this rave costume with skirt brings a polished metal look with striking presence. Its glossy, mirror-like coating creates a polished metal look. The result feels bold, clean, and ready for a night of movement and lights.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Our original studio design lets you shape the finished character through your own styling choices.\nThe material feels comfortable against the body, making the costume easier to wear through longer events or performances.\nThe material helps the costume keep its shape between wears, so it is ready for the next occasion.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women planning an expressive costume for a live music production. Festival-goers planning a studio-designed look for a long day of music and movement. Content creators planning distinctive visuals for festival shoots or music videos. Costume stylists sourcing an original distinctive piece for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We design this rave costume with skirt to bring a strong festival presence into your look. At TheFEYA, we develop pieces from our own ideas, so the finish feels original and expressive. We keep the silver direction bold and polished, helping you create a visual identity that feels personal.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Shoulders', 'Skirt'],
    },
    manual_focus: {
      event: ['festival', 'rave'],
      style: [],
      persona: [],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{
        keyword: 'rave outfit with skirt',
        keyword_norm: 'rave outfit with skirt',
        role: 'primary',
        avg_monthly_searches: 30,
        competition: 'HIGH',
        metric_source: 'google_keyword_planner',
      }],
      secondary: [{ keyword: 'silver rave skirt', keyword_norm: 'silver rave skirt', role: 'secondary' }],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const rawStructural = validateSeoAgentOutput(candidate);
  const rawCommercial = validateSeoCommercialCopy(candidate, context);
  assert.equal(rawStructural.ok, false);
  assert.equal(rawCommercial.ok, false);

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'rave outfit with skirt',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    included_components: context.product_truth.included_components,
    body_identity_variant: 'rave costume with skirt',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.intro,
    'This silver rave costume with skirt is made for festivals, raves and live music shows, with a comfortable fit for long days, dancing and late-night performances.',
  );
  assert.equal(
    normalized.meta_description,
    'Silver rave outfit with skirt in vegan leather for festivals, raves and live music shows.',
  );
  assert.equal(normalized.pdp_blocks[2].body.split('\n').length, 5);
  assert.equal(
    normalized.pdp_blocks[1].body,
    'Our studio-designed layered shoulders give the outfit a distinctive shape that stands out in a festival crowd and in photos.\nAdjustable straps make each piece easy to put on and fine-tune for a secure, comfortable fit.\nVegan leather helps the shoulder pieces and skirt hold their shape between wears when stored with care.',
  );
  assert.equal(
    normalized.pdp_blocks[0].body,
    'Designed for festivals, raves and live music shows, this silver outfit adds layered detail around the shoulders and a glossy, mirror-like finish. It catches the light as you move, helping the look stand out in the crowd and in photos or video.',
  );
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /finish feels original/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /silver direction|visual identity/i);
  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'Silver layered shoulder pieces and matching skirt worn at an outdoor music festival',
  );
});

test('paid chrome showgirl draft reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Metallic Dress Costume for Festivals',
    h1: 'Silver Metallic Dress Costume for Festivals',
    meta_description: 'Silver metallic dress costume with a polished silver finish for festivals and raves nights.',
    intro: 'For festivals, rave, the stage, and photoshoots, this silver metallic dress outfit brings a bold, futuristic edge that reads clearly in motion and under bright lights.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'silver metallic dress outfit with a choker and arm cuffs in a forest setting',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Silver metallic finish', 'Matching choker collar', 'Arm cuffs'],
      dna_matches: ['Futuristic glam'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: ['Exact fabric composition is not visible'],
      forbidden_visual_claims: ['Do not claim exact fabric content'],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'Built for festivals and raves nights, this silver metallic dress outfit frames the body with a polished, metal-inspired appearance. The smooth, high-gloss silver surface creates a beautifully polished, metal-inspired finish that catches light with a crisp, futuristic edge.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women seeking a futuristic glam outfit for a live music production.\nFestival-goers drawn to a dancer look for a long day of music and movement.\nLive performers choosing a showgirl-inspired outfit for a stage show or theatrical role.\nContent creators producing glam visuals for festival shoots or music videos.\nCostume stylists selecting a distinctive cosmic design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We designed this silver metallic dress outfit to make a festival, rave, or stage moment feel bold and unmistakable. Our fashion studio used a futuristic shape and a silver metallic dress outfit finish to create a look that feels vivid under lights. At TheFEYA, our designers shaped it for a wearer who wants to look memorable, polished, and unapologetically bright.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'warning',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Bracelet', 'Choker', 'Dress Only', 'Panties'],
    },
    manual_focus: {
      event: ['festival', 'rave', 'stage', 'photoshoot'],
      style: ['futuristic', 'glam', 'cosmic'],
      persona: ['dancer', 'performer', 'showgirl'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'silver metallic dress costume', keyword_norm: 'silver metallic dress costume', role: 'primary' }],
      secondary: [{ keyword: 'silver collar choker', keyword_norm: 'silver collar choker', role: 'secondary' }],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'silver metallic dress costume',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['silver', 'mirror', 'vegan leather', 'metallic'],
    included_components: context.product_truth.included_components,
    body_identity_variant: 'silver metallic dress outfit',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify({
    issues: keyword.issues,
    intro: normalized.intro,
    about: normalized.pdp_blocks[0]?.body,
    main: normalized.pdp_blocks[3]?.body,
  }));
  assert.equal(
    normalized.meta_description,
    'Silver metallic dress costume for women, created for festivals, stage shows and futuristic performance styling.',
  );
  assert.match(normalized.pdp_blocks[0].body, /available light during photos, video and live appearances/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /finish|under lights/i);
});

test('paid cosmic harness draft reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Rave Harness Outfit for Festivals',
    h1: 'Silver Rave Harness Outfit for Festivals',
    meta_description: 'Silver rave harness outfit with a polished finish for festivals and raves nights.',
    intro: 'For festivals, this rave harness costume brings a bold, distinctive edge to your look with an original studio design made for music, movement, and photoshoots.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'silver rave harness costume worn on a beach at sunset',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: ['Silver high-gloss bodywear', 'Structured harness straps', 'Metallic skirt'],
      dna_matches: ['Futuristic festival styling'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: ['Exact fabric composition cannot be confirmed from the image alone'],
      forbidden_visual_claims: ['Do not claim mirrored material as a fact'],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'This rave harness costume is made for festivals, rave nights, and photoshoots, where the body-skimming shape and bold silver finish stand out fast. Its smooth, high-gloss surface creates a beautifully polished, metal-inspired finish that feels striking in motion.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women seeking an expressive outfit for a live music production.\nFestival-goers drawn to an alien look for a long day of music and movement.\nContent creators producing cyberpunk visuals for festival shoots or music videos.\nCostume stylists selecting an original futuristic design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We designed this piece through TheFEYA to give rave harness costume energy a bold, wearable presence that feels memorable on arrival. Our fashion studio shaped the silver finish and harness lines for women who want a futuristic, cosmic mood without losing polish. We love how it reads as sharp, distinctive, and personal in festival and photo settings. It carries the kind of presence that makes a room look twice.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Shoulders', 'Skirt'],
      sellable_offer: { status: 'ready', component_labels: ['Shoulders', 'Skirt'] },
    },
    manual_focus: {
      event: ['festival', 'rave', 'photoshoot'],
      style: ['futuristic', 'cyberpunk', 'cosmic'],
      persona: ['alien'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'rave harness outfit', keyword_norm: 'rave harness outfit', role: 'primary' }],
      secondary: [
        { keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', role: 'secondary' },
        { keyword: 'metallic silver skirt outfit', keyword_norm: 'metallic silver skirt outfit', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'rave harness outfit',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['silver', 'mirror', 'vegan leather', 'metallic'],
    included_components: context.product_truth.included_components,
    body_identity_variant: 'rave harness costume',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.meta_description,
    'Silver rave harness outfit for women, created for festivals, rave nights and futuristic photoshoots.',
  );
  assert.match(normalized.pdp_blocks[0].body, /complete silver outfit/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /reads as|room look twice|costume energy/i);
});

test('paid silver Burning Man harness set reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Harness Festival Outfit for Burning Man',
    h1: 'Silver Harness Festival Outfit for Burning Man',
    meta_description: 'Silver harness festival outfit with a polished finish for Burning Man and rave nights.',
    intro: 'For Burning Man, festivals, and rave, this harness festival costume brings a bold, distinctive edge with its original studio design and silver statement presence.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'silver harness festival costume posed in a studio corridor',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'Silver metallic-looking harness pieces with a high-gloss finish',
        'Visible shoulder coverage with armor-like shaping',
        'Strap details across the arms and thighs',
        'Studio pose in a neutral indoor setting',
      ],
      dna_matches: [
        'Futuristic silver finish',
        'Cyberpunk-inspired harness styling',
        'Warrior-like statement profile',
      ],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [
        'Exact material composition cannot be confirmed from the image alone',
        'Closure method and adjustability are not fully visible',
      ],
      forbidden_visual_claims: [
        'Do not claim exact replica styling',
        'Do not claim included items not visible in the image',
      ],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'Built for Burning Man, festival nights, and rave settings, this harness festival costume frames the shoulders, arms, and legs with a striking silver presence. Its smooth, high-gloss surface creates a beautifully polished, metal-inspired finish.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: '- Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\n- The material feels comfortable against the body, making the garment easier to wear for extended periods.\n- With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women seeking a futuristic, cyberpunk look for a live music production.\nBurning Man attendees drawn to a warrior feel for long days and night sets.\nContent creators producing bold visuals for Burning Man shoots or music videos.\nCostume stylists selecting an original design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We designed this piece for women who want a fearless, fashion-led presence at festivals and desert gatherings. TheFEYA brings our original design ideas to a harness festival costume that feels bold, distinctive, and memorable. Our fashion studio shaped it for a futuristic warrior mood that stands out in motion. The result is a silver statement piece with an unmistakable edge.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Shoulders', 'Top Harness', 'Bracelet', 'Garters'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Shoulders', 'Top Harness', 'Bracelet', 'Garters'],
      },
    },
    manual_focus: {
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'cyberpunk', 'desert'],
      persona: ['warrior'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'harness festival outfit', keyword_norm: 'harness festival outfit', role: 'primary' }],
      secondary: [
        { keyword: 'silver body harness', keyword_norm: 'silver body harness', role: 'secondary' },
        { keyword: 'burning man harness', keyword_norm: 'burning man harness', role: 'secondary' },
        { keyword: 'rave harness outfit', keyword_norm: 'rave harness outfit', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'harness festival outfit',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['silver', 'mirror', 'vegan leather', 'metallic'],
    included_components: context.product_truth.included_components,
    body_identity_variant: 'harness festival costume',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.meta_description,
    'Silver harness festival outfit for women, created for Burning Man, rave nights and futuristic cyberpunk styling.',
  );
  assert.match(normalized.pdp_blocks[0].body, /high-gloss vegan leather surface/i);
  assert.match(normalized.pdp_blocks[3].body, /personal style/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /statement piece|unmistakable edge/i);
});

test('paid silver mens warrior set reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Metallic Outfit for Burning Man',
    h1: 'Silver Metallic Outfit for Burning Man',
    meta_description: 'Silver silver metallic outfit with a polished finish for Burning Man and rave nights.',
    intro: 'For Burning Man, this silver metallic costume brings a bold, distinctive look that suits long days in the dust and after-dark energy.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'silver metallic costume worn by a man walking across a dusty desert festival ground',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'Silver metallic-looking shoulder and upper-body pieces',
        'Layered silver skirt panels',
        'Matching wrist and forearm pieces',
        'Male model photographed on a dusty desert festival ground',
      ],
      dna_matches: [
        'Futuristic silver finish',
        'Cyberpunk-inspired warrior styling',
        'Desert festival presentation',
      ],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [
        'Exact closure method is not fully visible',
        'Base layers and footwear are not confirmed as included',
      ],
      forbidden_visual_claims: [
        'Do not claim base layers or footwear are included',
        'Do not claim exact replica styling',
      ],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'For Burning Man and rave nights, this silver metallic costume gives men a bold, festival-ready presence with a polished, metal-inspired finish. The clean shine and layered detailing help the look feel striking while staying visually cohesive in bright daylight and at night sets.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the layered shoulder lines and warrior-inspired shape give the outfit a distinctive, memorable character that feels personal.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Men seeking an expressive outfit for a live music production.\nBurning Man attendees drawn to a warrior look for long days and night sets.\nContent creators producing cyberpunk visuals for Burning Man shoots or music videos.\nCostume stylists selecting an original futuristic design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We designed this piece for people who want a silver metallic costume with presence, clarity, and movement-ready energy. At TheFEYA, our fashion studio shaped the look for Burning Man and festival scenes where bold dressing reads from a distance. Our original design ideas turn the silver metallic costume into something memorable, personal, and ready to stand out in the dust.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Bracelet', 'Shoulders', 'Skirt', 'Top'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Bracelet', 'Shoulders', 'Skirt', 'Top'],
      },
    },
    manual_focus: {
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'cyberpunk', 'desert'],
      persona: ['warrior'],
      audience: ['men'],
    },
    keyword_roles: {
      primary: [{ keyword: 'silver metallic outfit', keyword_norm: 'silver metallic outfit', role: 'primary' }],
      secondary: [
        { keyword: 'rave what to wear', keyword_norm: 'rave what to wear', role: 'secondary' },
        { keyword: 'burning man men outfit', keyword_norm: 'burning man men outfit', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'silver metallic outfit',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['silver', 'mirror', 'vegan leather', 'metallic'],
    included_components: context.product_truth.included_components,
    body_identity_variant: 'silver metallic costume',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.meta_description,
    'Silver metallic outfit for men, created for Burning Man, rave nights and futuristic desert styling.',
  );
  assert.match(normalized.pdp_blocks[0].body, /layered skirt panels/i);
  assert.match(normalized.pdp_blocks[1].body, /between wears/i);
  assert.match(normalized.pdp_blocks[3].body, /personal style/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /reads from a distance|stand out in the dust/i);
});

test('paid gold Burning Man fringe set reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Gold Burning Man Outfit',
    h1: 'Gold Burning Man Outfit',
    meta_description: 'Gold Burning Man outfit with a polished gold finish for festivals and raves nights.',
    intro: 'For Burning Man, festivals, and rave, this gold Burning Man costume brings a bold studio-made presence to the gold Burning Man costume wearer.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'gold Burning Man costume with a black bodysuit and gold fringe skirt standing in a desert setting',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'Gold and black color palette',
        'Long-sleeve black base garment visible on the model',
        'Gold shoulder accents and chest harness details',
        'Gold fringe skirt panels at the waist',
        'Worn in a desert setting',
      ],
      dna_matches: ['futuristic festival costume', 'glam desert look'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [
        'Exact fabric composition',
        'Back closure details',
      ],
      forbidden_visual_claims: [
        'Do not claim the black base garment is included',
        'Do not claim metal construction',
      ],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'Designed for Burning Man, festivals, and rave, this gold Burning Man costume brings a confident stage-ready energy to long event days. Its smooth, high-gloss surface creates a beautifully polished, metal-inspired finish.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women seeking an expressive outfit for a live music production.\nBurning Man attendees drawn to a futuristic look for long days and night sets.\nContent creators producing desert visuals for Burning Man shoots or music videos.\nCostume stylists selecting an original futuristic design for themed shows or editorials.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'We designed this piece for women who want a gold Burning Man costume with a strong, modern presence. At TheFEYA, our fashion studio shaped it to feel bold in desert light and memorable on stage. Our original design idea turns festival energy into a striking look that feels personal and unmistakable. It carries a confident, futuristic character that reads instantly in motion.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'pass',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'warning',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Gold',
      included_components: ['Skirt', 'Top'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Skirt', 'Top'],
      },
    },
    manual_focus: {
      event: ['burning man', 'festival', 'rave'],
      style: ['futuristic', 'desert', 'glam'],
      persona: [],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'gold burning man outfit', keyword_norm: 'gold burning man outfit', role: 'primary' }],
      secondary: [
        { keyword: 'gold rave skirt', keyword_norm: 'gold rave skirt', role: 'secondary' },
        { keyword: 'rave harness top', keyword_norm: 'rave harness top', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [{ keyword: 'rave what to wear', keyword_norm: 'rave what to wear', role: 'faq_commercial' }],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'gold burning man outfit',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['gold', 'mirror', 'vegan leather', 'metallic'],
    included_components: context.product_truth.included_components,
    body_identity_variant: 'gold Burning Man costume',
    product_color: 'Gold',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.meta_description,
    'Gold Burning Man outfit for women, created for festivals, rave nights and futuristic desert styling.',
  );
  assert.match(normalized.pdp_blocks[0].body, /flowing fringe panels/i);
  assert.match(normalized.pdp_blocks[3].body, /personal style/i);
  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'gold festival costume with angular shoulder details and fringe skirt panels in a desert setting',
  );
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /desert light|reads instantly/i);
  assert.doesNotMatch(normalized.image_alt_candidates[0].alt_text, /bodysuit|base garment/i);
});

test('paid Cosmic silver set reaches PASS through exact zero-token recovery', () => {
  const candidate = {
    contract_version: 'seo_agent_output_v1',
    status: 'draft',
    seo_title: 'Silver Metallic Top And Skirt Set for Festivals',
    h1: 'Silver Metallic Top And Skirt Set for Festivals',
    meta_description: 'Silver metallic top and skirt set for rave nights, festival moments, and photoshoots with a polished finish.',
    intro: 'For festivals, rave, and photoshoots, this metallic top and skirt outfit brings a bold, distinctive edge that feels made for striking moments.',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: [{
      image_role: 'primary',
      alt_text: 'silver metallic top and skirt outfit in a desert setting',
      truth_basis: 'visible_product_fact',
    }],
    internal_linking_hints: [],
    visual_truth: {
      observed_product_facts: [
        'silver-toned metallic-looking panels',
        'black long-sleeve base layer visible',
        'strappy harness-style details',
        'skirted lower piece with mirrored shine',
        'desert outdoor setting',
      ],
      dna_matches: ['futuristic', 'cyberpunk', 'cosmic', 'festival-ready'],
      open_style_suggestions: [],
      uncertain_or_missing_facts: [
        'exact fabric composition',
        'whether the full photographed styling matches the sold set exactly',
        'whether all visible accessories are included',
      ],
      forbidden_visual_claims: [
        'exact character replica claims',
        'unfinished or transformable garment claims',
        'metallic material certainty beyond appearance',
      ],
    },
    pdp_blocks: [
      {
        block_key: 'about_this_piece',
        placement: 'left_description',
        heading: 'About this piece',
        source_basis: 'product_fact',
        body: 'Designed for festivals, rave nights, and photoshoots, this metallic top and skirt outfit brings a polished, metal-inspired finish with a bold studio feel. The smooth, high-gloss silver surface creates a beautifully polished, metal-inspired finish. It adds a striking edge that reads futuristic without losing its wearable shape.',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        source_basis: 'product_fact',
        body: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.\nThe material feels comfortable against the body, making the garment easier to wear for extended periods.\nWith careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        source_basis: 'product_fact',
        body: 'Women seeking a futuristic look for a live music production.\nFestival-goers drawn to a robot look for a long day of music and movement.\nContent creators producing cyberpunk visuals for festival shoots or music videos.\nCostume stylists selecting an original futuristic design for themed shows or editorials.\nPerformers choosing a cosmic outfit for stage energy and visual impact.',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        source_basis: 'brand_policy',
        body: 'At TheFEYA, our fashion studio designed this metallic top and skirt outfit for women who want a bold, memorable presence in festivals, rave scenes, and photoshoots. Our designers shaped the silver finish to feel futuristic and edgy while keeping the look visually clean and distinctive. We made it for a confident wearer who likes cosmic energy with a cyberpunk twist. The result feels personal, vivid, and ready to stand out.',
        needs_human_review: false,
      },
    ],
    qa_self_report: {
      cliche_phrase: 'pass',
      long_dash: 'pass',
      keyword_stuffing: 'pass',
      product_specificity: 'pass',
      forbidden_mismatch: 'warning',
      similarity_cannibalization: 'pass',
      image_alt_truth: 'pass',
      commercial_placement: 'pass',
      validated_metrics: 'not_checked',
      notes: [],
    },
    generation_notes: [],
  } as any;
  const context = {
    product_truth: {
      color: 'Silver',
      included_components: ['Garters', 'Panties', 'Skirt', 'Top'],
      sellable_offer: {
        status: 'ready',
        component_labels: ['Garters', 'Panties', 'Skirt', 'Top'],
      },
    },
    manual_focus: {
      event: ['festival', 'rave', 'photoshoot'],
      style: ['futuristic', 'cyberpunk', 'desert', 'cosmic', 'sci fi'],
      persona: ['robot', 'alien'],
      audience: ['women'],
    },
    keyword_roles: {
      primary: [{ keyword: 'metallic top and skirt set', keyword_norm: 'metallic top and skirt set', role: 'primary' }],
      secondary: [
        { keyword: 'rave outfit with skirt', keyword_norm: 'rave outfit with skirt', role: 'secondary' },
        { keyword: 'metallic silver skirt outfit', keyword_norm: 'metallic silver skirt outfit', role: 'secondary' },
        { keyword: 'silver rave skirt', keyword_norm: 'silver rave skirt', role: 'secondary' },
        { keyword: 'metallic skirt outfit', keyword_norm: 'metallic skirt outfit', role: 'secondary' },
        { keyword: 'silver skirt outfit', keyword_norm: 'silver skirt outfit', role: 'secondary' },
      ],
      support: [],
      image_alt: [],
      collection: [],
      faq_commercial: [{ keyword: 'rave what to wear', keyword_norm: 'rave what to wear', role: 'faq_commercial' }],
      hold: [],
      reject: [],
    },
  } as any;

  const normalized = normalizeSeoEditorialCandidate(candidate, {
    primary_keyword: 'metallic top and skirt set',
    selected_events: context.manual_focus.event,
    selected_styles: context.manual_focus.style,
    selected_materials: ['silver', 'mirror', 'vegan leather', 'metallic'],
    included_components: ['Garters', 'Panties', 'Skirt', 'Top'],
    body_identity_variant: 'silver metallic costume',
    product_color: 'Silver',
  });
  const structural = validateSeoAgentOutput(normalized);
  const commercial = validateSeoCommercialCopy(normalized, context);
  const keyword = validateSeoKeywordPlacement(normalized, {
    product_truth: context.product_truth,
    keyword_roles: context.keyword_roles,
  } as any);

  assert.equal(structural.ok, true, JSON.stringify(structural.issues));
  assert.equal(commercial.ok, true, JSON.stringify(commercial.issues));
  assert.equal(keyword.ok, true, JSON.stringify(keyword.issues));
  assert.equal(
    normalized.meta_description,
    'Silver metallic top and skirt set for rave nights, festivals, cyberpunk styling and futuristic photoshoots.',
  );
  assert.match(normalized.pdp_blocks[0].body, /angular harness-style lines/i);
  assert.match(normalized.pdp_blocks[3].body, /personal style/i);
  assert.doesNotMatch(normalized.intro, /top and skirt|polished finish/i);
  assert.doesNotMatch(normalized.pdp_blocks[3].body, /silver finish|stand out/i);
  assert.equal(
    normalized.image_alt_candidates[0].alt_text,
    'silver metallic top and skirt outfit in a desert setting',
  );
});
