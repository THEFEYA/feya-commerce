import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildCurrentSeoProductEvidence,
  mapFactSheetRow,
} from '../../lib/seoProductFactSheet.ts';
import { buildCompactSeoWriterPrompt } from '../../lib/seoClaimPlanV2.ts';
import { generateSeoDraftWithOpenAi } from '../../lib/seoOpenAiDraftGenerator.ts';

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
  assert.ok(prompt.user_prompt.includes('Shoulders'));
  assert.ok(prompt.user_prompt.includes('Skirt'));
  assert.ok(prompt.system_prompt.length + prompt.user_prompt.length < 18_000);
  assert.equal(brief.claim_plan.family_profile, 'multi_component_outfit');
  assert.ok(brief.claim_plan.claims.length >= 3);
  assert.ok(brief.already_covered_topics.includes('shipping and delivery'));
  assert.ok(brief.already_covered_topics.includes('care instructions'));
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
  assert.deepEqual(brief.current_sellable_offer?.component_labels, ['Dress']);
  assert.equal(prompt.user_prompt.includes('Shoulders'), false);
  assert.equal(prompt.user_prompt.includes('Skirt'), false);
  assert.equal(prompt.user_prompt.includes('warrior armor costume'), false);
  assert.ok(prompt.user_prompt.includes('black festival dress'));
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
