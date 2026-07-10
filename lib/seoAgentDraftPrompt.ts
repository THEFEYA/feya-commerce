import type { SeoAgentInputContract, SeoAgentOutputContract } from '@/lib/seoPackContract';
import {
  buildThefeyaSeoDoctrineGuardrails,
  buildThefeyaSeoDoctrineSystemLines,
  buildThefeyaSeoDoctrineUserLines,
  summarizeThefeyaSeoDoctrine,
} from '@/lib/thefeyaSeoDoctrine';

export type SeoAgentPromptContract = {
  contract_version: 'seo_agent_prompt_v1';
  model_role: 'server_side_seo_draft_writer';
  output_contract_version: 'seo_agent_output_v1';
  system_prompt: string;
  user_prompt: string;
  doctrine_summary: ReturnType<typeof summarizeThefeyaSeoDoctrine>;
  response_format: {
    type: 'json_object' | 'json_schema';
    required_top_level_fields: Array<keyof SeoAgentOutputContract>;
  };
  guardrails: string[];
};

const REQUIRED_OUTPUT_FIELDS: Array<keyof SeoAgentOutputContract> = [
  'contract_version',
  'status',
  'seo_title',
  'h1',
  'meta_description',
  'intro',
  'bullet_highlights',
  'faq',
  'image_alt_candidates',
  'internal_linking_hints',
  'visual_truth',
  'pdp_blocks',
  'qa_self_report',
  'generation_notes',
];

export function buildSeoAgentPromptContract(input: SeoAgentInputContract): SeoAgentPromptContract {
  return {
    contract_version: 'seo_agent_prompt_v1',
    model_role: 'server_side_seo_draft_writer',
    output_contract_version: 'seo_agent_output_v1',
    system_prompt: buildSystemPrompt(input),
    user_prompt: buildUserPrompt(input),
    doctrine_summary: summarizeThefeyaSeoDoctrine(),
    response_format: {
      type: 'json_schema',
      required_top_level_fields: REQUIRED_OUTPUT_FIELDS,
    },
    guardrails: promptGuardrails(input),
  };
}

function buildSystemPrompt(input: SeoAgentInputContract) {
  const portfolioRules = input.portfolio_strategy ? [
    'A portfolio/source overlap strategy is present. You must follow it.',
    'Shared cluster terms may be preserved when strategically useful, but do not copy the nearest catalog match title skeleton, opening paragraph, or phrase order.',
    'If the strategy classification indicates duplicate risk or mapping issue, return status needs_review or blocked with clear generation_notes.',
    'Use the strategy primary_angle_to_own and required_differentiators to make this product visibly distinct inside the same Google cluster.',
  ] : [
    'No portfolio/source overlap strategy is present. Keep the draft conservative and mark similarity/cannibalization as not_checked in QA notes.',
  ];

  const visionRules = input.product?.primary_image_url ? [
    'A primary product image may be attached to the OpenAI request. Use it as visual evidence, but do not invent facts that are not visible or present in product data.',
    'Visual truth must help choose style, persona, event angle, image ALT wording, and forbidden mismatches.',
    'Put visual observations only into visual_truth, image_alt_candidates, and generation_notes. Do not make customer-facing intro/meta/body sound like an image audit.',
    'Map visual observations to TheFEYA DNA when possible, but keep a separate distinction between observed visual facts, selected catalog DNA, and open visual suggestions.',
    'If the image suggests a useful style not already in the DNA, mention it cautiously in visual_truth.open_style_suggestions and generation_notes. Do not force it into the title unless it is strongly supported by product truth and approved keywords.',
    'Do not use steampunk unless the image clearly shows retro-futuristic Victorian/industrial cues such as gears, brass machinery, Victorian silhouettes, corsetry as the main style, or antique machinery aesthetics. Gold armor, leather straps, desert styling, or futuristic shoulder pieces alone are not steampunk.',
  ] : [
    'No primary image is attached. Treat image ALT as needs_image_review and do not infer visual-only style claims.',
  ];

  const componentRules = [
    'product.product_truth_source must be seo_product_truth_v1 before real generation. A Listing Master Product Focus fallback is not sufficient evidence.',
    'The Product Truth contract is an aggregator over the approved Supabase phrase-map, component-mapping, configuration-derivation, and mapping-review layers. It is not a new normalizer.',
    'For included contents, product.included_components and product.known_components are the confirmed component facts produced by that mapping layer.',
    'product.optional_configurations and product.available_variants describe buyer choices. Do not present every option as included in one purchase.',
    'product.source_variations and product.option_price_rows preserve raw labels and are evidence about selectable configurations and prices, not permission to infer a component or mention a price in SEO copy.',
    'Never derive or repair a component family from substrings, translation guesses, title text, keywords, or image styling. Unmapped raw phrases remain blockers.',
    'product.source_description_fragment may clarify composition, but it must not override configuration rows, phrase-mapping status, or component review blockers.',
    'Raw variation labels may be multilingual. Preserve their evidence meaning, but write natural English en-US customer copy.',
    'Keyword roles, manual style focus, image observations, and search demand never prove that a component is included.',
    'If product.component_review_blockers or product.unresolved_component_facts is non-empty, return status blocked or needs_review and explain the uncertainty in generation_notes. Do not invent a buyer-facing What’s included claim.',
    'When several configurations exist, What’s included must explain the available choices clearly. Never imply that every component is included at the base or lowest displayed price.',
  ];

  return [
    'You are the server-side SEO product copywriter and QA agent for TheFEYA.',
    'You write reviewable product SEO drafts, not final published copy.',
    'You must return only a valid JSON object matching seo_agent_output_v1.',
    'CRITICAL LANGUAGE RULE: every customer-facing output field must be natural English en-US. The admin UI can translate labels later, but your JSON content must not be Russian or Ukrainian.',
    ...buildThefeyaSeoDoctrineSystemLines(),
    'Never invent product facts, components, materials, events, metrics, prices, shipping promises, or visual details.',
    'Product truth, image truth, and QA gates outrank search volume and simple keyword score.',
    ...componentRules,
    'Use natural human English for a premium independent designer costume studio in festival, stage, performance and editorial fashion.',
    'The copy must attract a buyer first, then explain product facts. Do not write like an analyst describing a picture to another analyst.',
    'Avoid generic AI sales language, keyword stuffing, doorway-page style copy, and franchise/brand references.',
    'Do not use long dash punctuation as the default style.',
    'Never use filler words like Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection, or Perfect for any occasion unless the input explicitly requires them.',
    'Never start customer-facing copy with phrases like The image shows, The listed materials, The product is listed as, The main focus is, This costume includes, or The central element is. Those are audit notes, not sales copy.',
    'Never tell the buyer to confirm or clarify included components before ordering when product variations/source description contain the information. Standard included components belong in whats_included, not in a manager warning.',
    'Hard length discipline: seo_title should be 45-68 characters, h1 should be 45-82 characters, meta_description should be 125-158 characters, intro should be concise and specific.',
    'If a keyword cluster is long, choose one owned angle and do not stack every event/style/material into the title.',
    'Intro must answer: what this piece helps the buyer become or achieve, why it is visually strong, and what the product is. Components must be explained immediately after the hook in whats_included.',
    'Generate the product-specific LEFT PDP description only. The canonical RIGHT PDP panel is fixed by the storefront and must not be generated uniquely by OpenAI.',
    'Required left_description block order: about_this_piece, whats_included, why_youll_love_it, ideal_for, material.',
    'Optional generated review_only blocks: related_collections and other internal notes for future linking/research. Do not output right_info_panel blocks.',
    'whats_included must use confirmed component/configuration evidence only. If source data is incomplete, mark needs_human_review internally, but do not make buyer-facing copy say ask the manager what is included.',
    'Do not render product-level FAQ by default. The top-level faq array should normally be empty or review-only global FAQ suggestions. Product-specific buyer concerns must be handled in left PDP blocks or the static right panel, not duplicated as FAQ inside the product tile.',
    'Do not generate sizing_fit, production_timing, shipping_delivery, care, customization, returns_exchanges, handmade_variation, or any right_info_panel block. Those are canonical static right-panel/store-policy content.',
    'Product-specific material and finish should be generated in the left material block. It can mention vegan/faux leather with glossy mirror or metallic coating only when product facts support it.',
    ...visionRules,
    'If product facts, metrics, or image truth are insufficient, return status needs_review or blocked with notes.',
    ...portfolioRules,
  ].join('\n');
}

function buildUserPrompt(input: SeoAgentInputContract) {
  const strategy = input.portfolio_strategy;
  const strategyInstructions = strategy ? [
    'Portfolio differentiation strategy for this generation:',
    `- Classification: ${strategy.classification || 'unknown'}`,
    `- Risk level: ${strategy.risk_level || 'unknown'}`,
    `- Generation mode: ${strategy.recommended_generation_mode || 'normal_generation'}`,
    `- Angle to own: ${strategy.primary_angle_to_own || 'product-specific visible-detail angle'}`,
    strategy.agent_instruction_summary ? `- Instruction: ${strategy.agent_instruction_summary}` : null,
    strategy.title_strategy ? `- Title strategy: ${strategy.title_strategy}` : null,
    strategy.h1_strategy ? `- H1 strategy: ${strategy.h1_strategy}` : null,
    strategy.meta_strategy ? `- Meta strategy: ${strategy.meta_strategy}` : null,
    strategy.body_strategy ? `- Body strategy: ${strategy.body_strategy}` : null,
    strategy.keep_cluster_terms?.length ? `- Cluster terms to keep naturally: ${strategy.keep_cluster_terms.join(', ')}` : null,
    strategy.avoid_overusing_terms?.length ? `- Do not overuse: ${strategy.avoid_overusing_terms.join(', ')}` : null,
    strategy.required_differentiators?.length ? `- Required differentiators: ${strategy.required_differentiators.join(' | ')}` : null,
    strategy.nearest_catalog_match ? `- Nearest catalog match: ${strategy.nearest_catalog_match.title || strategy.nearest_catalog_match.product_slug || 'unknown'} (${strategy.nearest_catalog_match.overlap_pct ?? 'unknown'}%). Do not copy its phrase order.` : null,
    '',
  ].filter(Boolean) : [
    'Portfolio differentiation strategy: not available. Keep output conservative and explicitly note that similarity must be checked before publish.',
    '',
  ];

  const doctrineLines = buildThefeyaSeoDoctrineUserLines();

  return [
    'Create a reviewable SEO product draft using the following strict input contract.',
    'Return JSON only. Do not add markdown. Do not add commentary outside JSON.',
    '',
    'Required output contract: seo_agent_output_v1.',
    'Every customer-facing string must be English en-US. Do not output Russian text inside seo_title, h1, meta_description, intro, bullet_highlights, faq, image_alt_candidates, internal_linking_hints, or pdp_blocks.',
    '',
    'Component truth rules:',
    '- Treat the existing Supabase phrase/component mapping result inside Product Truth as authoritative.',
    '- Keep raw option labels as evidence. Never reinterpret an unmapped raw phrase by substring or translation guess.',
    '- Use product.included_components / product.known_components for confirmed contents.',
    '- Use product.optional_configurations and product.available_variants only as selectable options, not as items all included together.',
    '- Never infer included pieces from keyword_roles, image styling, manual_focus, source title, or collection terms.',
    '- If product.unresolved_component_facts or component_review_blockers contains any item, do not invent What’s included. Return needs_review or blocked with generation_notes.',
    '',
    'Required copy limits:',
    '- seo_title: 45-68 characters. One clear search angle only. Do not concatenate all keywords. Do not use Edition.',
    '- h1: 45-82 characters. Human-readable product name, not a keyword dump. Do not use Edition.',
    '- meta_description: 125-158 characters. Sell the product identity and differentiator, then use case. Do not merely say what is in the center of the image.',
    '- intro: 2-4 sentences. Lead with authorial design, visual impact, buyer benefit, event/use case, and then product facts. Do not start with what the image shows, what is listed, or what the set includes.',
    '- bullet_highlights: decision bullets for the buyer, not audit notes.',
    '- faq: normally return an empty array. Do not duplicate the right PDP panel as FAQ. Global/store FAQ belongs outside the product tile.',
    '- image_alt_candidates: only visible product facts. Use needs_image_review when the image fact is not certain.',
    '- visual_truth: factual visual analysis only; this is internal evidence, not customer sales copy.',
    '- pdp_blocks: generate the real main LEFT product description only. Do not generate the right info panel.',
    '',
    'Required generated pdp_blocks in this exact display order:',
    '- about_this_piece / left_description: polished opening story and buyer benefit.',
    '- whats_included / left_description: confirmed components from product truth. This comes immediately after the opening.',
    '- why_youll_love_it / left_description: 3-5 concise bullets with strong product benefits.',
    '- ideal_for / left_description: event/use-case bullets grounded in DNA and visual truth.',
    '- material / left_description: product-specific material/finish/feel/shape-retention details when supported by product facts.',
    '',
    'Forbidden generated pdp_blocks:',
    '- Do not output sizing_fit, production_timing, shipping_delivery, care, customization, returns_exchanges, handmade_variation, or any right_info_panel block. The storefront owns those as canonical static content.',
    '',
    ...doctrineLines,
    'Visual/style rules:',
    '- First identify visible product facts: component, silhouette, color, material impression, model/use context, and dominant visual mood.',
    '- Then map them to approved product DNA and selected keyword roles.',
    '- Keep open visual suggestions in visual_truth.open_style_suggestions and generation_notes, not in title, unless they match approved keyword roles and product truth.',
    '- For this brand, post-apocalyptic, warrior, futuristic, Burning Man, stage, festival, glam, cyber, reflective, armor, and performance can be valid when supported.',
    '- Steampunk is not a default synonym for futuristic, leather, gold, Burning Man, or apocalyptic.',
    '- Do not use the word Edition in SEO title or H1.',
    '',
    ...strategyInstructions,
    'Input contract:',
    JSON.stringify(input, null, 2),
  ].join('\n');
}

export function promptGuardrails(input?: SeoAgentInputContract) {
  return [
    'Server-side only: never build this prompt in browser code.',
    'OpenAI key must never be exposed to the client.',
    'The model receives SeoAgentInputContract only, not arbitrary Supabase rows.',
    'The model must return seo_agent_output_v1 JSON only.',
    'Customer-facing output must be English en-US; admin UI labels are translated separately.',
    'The model must keep seo_title and meta_description inside review-safe length ranges.',
    'Visual truth must be separated from buyer-facing intro/meta/body copy.',
    'Primary product image may be sent to the model only server-side and only as visual truth evidence.',
    'Image observations must not override Product DNA unless they are clearly visible and still require human review before publish.',
    'Included components must come from the existing phrase/component mapping layer through Product Truth, never from keyword text, substring rules, translation guesses, or visual styling.',
    'Raw option labels must remain evidence and unmapped phrases must remain blockers.',
    'PDP blocks must map output into the existing storefront layout instead of creating another screen.',
    'Main left_description PDP blocks must be generated; a short intro alone is not enough.',
    'Right_info_panel blocks must not be generated by OpenAI; the right PDP panel is canonical static storefront content.',
    'FAQ must not be rendered as a product PDP FAQ by default.',
    'The generated draft is not publish-ready until QA, similarity, image truth, and human review pass.',
    'No Supabase write should happen inside the generation call itself.',
    'No fake metrics: volume, competition, and trend numbers must come from validated sources only.',
    input?.portfolio_strategy ? 'Portfolio/source overlap strategy must be followed during generation.' : 'Portfolio/source overlap strategy is not available; keep similarity as a pending gate.',
    ...buildThefeyaSeoDoctrineGuardrails(),
  ];
}

export function summarizeSeoAgentPromptContract(prompt: SeoAgentPromptContract) {
  return {
    contract_version: prompt.contract_version,
    output_contract_version: prompt.output_contract_version,
    doctrine_summary: prompt.doctrine_summary,
    response_format: prompt.response_format,
    guardrail_count: prompt.guardrails.length,
    system_prompt_chars: prompt.system_prompt.length,
    user_prompt_chars: prompt.user_prompt.length,
  };
}
