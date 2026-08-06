import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCurrentSeoProductEvidence,
  mapFactSheetRow,
} from '../../lib/seoProductFactSheet.ts';
import { buildCompactSeoWriterPrompt } from '../../lib/seoClaimPlanV2.ts';
import { generateSeoDraftWithOpenAi } from '../../lib/seoOpenAiDraftGenerator.ts';
import { normalizeCodeOwnedSeoCollections } from '../../lib/seoEditorialCandidateSelection.ts';
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

test('writer brief uses current offer and excludes raw legacy wording', () => {
  const input = inputContract();
  const evidence = buildCurrentSeoProductEvidence(input);
  const { prompt, brief } = buildCompactSeoWriterPrompt(input, {
    readiness: { mode: 'READY_FULL', allowed_customer_sections: ['intro'], suppressed_customer_sections: [] },
    primaryImageUrl: 'https://example.com/product.jpg',
  });

  assert.deepEqual(brief.current_sellable_offer?.component_labels, ['Shoulders', 'Skirt']);
  assert.equal(brief.current_sellable_offer?.aggregate_options[0]?.label, 'Full Set');
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
  assert.ok(prompt.user_prompt.includes('Shoulders'));
  assert.ok(prompt.user_prompt.includes('Skirt'));
  assert.ok(prompt.system_prompt.length + prompt.user_prompt.length < 12_000);
  assert.equal(brief.claim_plan.family_profile, 'multi_component_outfit');
  assert.deepEqual(brief.claim_plan.blockers, []);
  assert.equal(brief.claim_plan.claims.filter((claim) => claim.target_block === 'about_this_piece').length, 1);
  assert.ok(brief.claim_plan.claims.filter((claim) => claim.target_block === 'why_youll_love_it').length >= 3);
  assert.equal(/unsupported|invented/i.test(brief.claim_plan.buyer_job_en), false);
  assert.ok(brief.ideal_for_allowed_labels.includes('festival'));
  assert.ok(brief.ideal_for_allowed_labels.includes('performer'));
  assert.ok(brief.already_covered_topics.includes('shipping and delivery'));
  assert.ok(brief.already_covered_topics.includes('care instructions'));
  assert.match(prompt.system_prompt, /About this piece: 40-70 words in 2-4/);
  assert.match(prompt.system_prompt, /Designed for self-expression: 45-75 words in 3-4/);
  assert.match(prompt.system_prompt, /Return bullet_highlights as \[\]/);
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
  assert.ok(brief.claim_plan.blockers.includes('claim_plan_insufficient_distinct_why_claims'));
  assert.deepEqual(brief.current_sellable_offer?.component_labels, ['Dress']);
  assert.equal(prompt.user_prompt.includes('Shoulders'), false);
  assert.equal(prompt.user_prompt.includes('Skirt'), false);
  assert.equal(prompt.user_prompt.includes('warrior armor costume'), false);
  assert.ok(prompt.user_prompt.includes('black festival dress'));
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
    seo_title: 'Warrior Armor Costume for Festival',
    h1: 'Warrior Armor Costume for Festival',
    meta_description: 'Warrior armor costume for festival and cosplay styling, with a gold finish for futuristic and fantasy character looks.',
    intro: 'This gold warrior armor outfit is designed for festival and cosplay styling, giving you a clear base for a futuristic or fantasy character.',
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
        body: 'Choose this gold armor outfit when you need a complete warrior character for festival or cosplay use. Its glossy mirror-like coating creates a polished metallic surface, giving the costume a distinctive finish that works naturally with futuristic and fantasy styling.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'why_youll_love_it',
        placement: 'left_description',
        heading: 'Why you’ll love it',
        body: '- Our original studio design gives you a distinctive costume for a look that feels personal.\n- The material feels comfortable against the body, making longer wear easier.\n- The material keeps its shape between wears, so the outfit stays ready for future use.\n- The pieces are available separately or together, so you can restyle the outfit for future use.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'ideal_for',
        placement: 'left_description',
        heading: 'Ideal for',
        body: '- Festival performers choosing a gold warrior costume for a live set.\n- Cosplayers developing a futuristic or fantasy warrior character.\n- Costume buyers planning a fantasy look for an upcoming festival.\n- Performers preparing a distinctive cosplay outfit for character-led productions.',
        source_basis: 'product_fact',
        needs_human_review: false,
      },
      {
        block_key: 'main_description',
        placement: 'left_description',
        heading: 'Designed for self-expression',
        body: 'At TheFEYA, we bring an independent point of view to festival and stage fashion. Our original ideas help you choose a design that feels personal. This gold armor outfit supports a complete warrior character with a futuristic or fantasy edge. It gives you a clear foundation for self-expression at festivals and in cosplay.',
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
          output_text: '{}',
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
    const generatedBlockKeys = requestBody.text.format.schema.properties.pdp_blocks
      .items.properties.block_key.enum;
    assert.equal(generatedBlockKeys.includes('whats_included'), false);
    assert.equal(generatedBlockKeys.includes('material'), false);
    assert.equal(result.telemetry.usage?.total_tokens, 160);
    assert.equal(result.telemetry.usage?.cached_input_tokens, 20);
    assert.equal(result.telemetry.prompt_hash.length, 64);
    assert.equal('system_prompt' in result.telemetry, false);
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
