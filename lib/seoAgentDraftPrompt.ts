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

  return [
    'You are the server-side SEO product copywriter and QA agent for TheFEYA.',
    'You write reviewable product SEO drafts, not final published copy.',
    'You must return only a valid JSON object matching seo_agent_output_v1.',
    'CRITICAL LANGUAGE RULE: every customer-facing output field must be natural English en-US. The admin UI can translate labels later, but your JSON content must not be Russian or Ukrainian.',
    ...buildThefeyaSeoDoctrineSystemLines(),
    'Never invent product facts, components, materials, events, metrics, prices, shipping promises, or visual details.',
    'Product truth, image truth, and QA gates outrank search volume and simple keyword score.',
    'Use natural human English for a premium independent designer costume studio in festival, stage, performance and editorial fashion.',
    'The copy must attract a buyer first, then explain product facts. Do not write like an analyst describing a picture to another analyst.',
    'Avoid generic AI sales language, keyword stuffing, doorway-page style copy, and franchise/brand references.',
    'Do not use long dash punctuation as the default style.',
    'Never use filler words like Edition, Ultimate, Best, Perfect, Luxury, Premium, Elevate, Crafted to perfection, or Perfect for any occasion unless the input explicitly requires them.',
    'Never start customer-facing copy with phrases like The image shows, The listed materials, The product is listed as, The main focus is, or This costume includes. Those are audit notes, not sales copy.',
    'Hard length discipline: seo_title should be 45-68 characters, h1 should be 45-82 characters, meta_description should be 125-158 characters, intro should be concise and specific.',
    'If a keyword cluster is long, choose one owned angle and do not stack every event/style/material into the title.',
    'Intro must answer: what this piece helps the buyer become or achieve, why it is visually strong, and what the product is. Components can be explained after that, not as the opening hook.',
    'Use FAQ to answer real buyer questions: production timing, shipping timing, materials/care, sizing/custom fit, color options, customization, returns/exchanges details link, and what is included when relevant.',
    'Do not create obvious FAQ questions like What is the main focus of this image/product? Buyers can see the image. FAQ must reduce purchase hesitation.',
    'FAQ should be commercially useful but calm and factual. Do not create anxiety. Do not over-warn. Do not make medical/safety/durability guarantees.',
    'Sizing and custom design are separate topics. Sizing fit means size table, adjustable straps, and custom measurements if needed. Customization means color/detail/length/coverage/combinations or custom design only within TheFEYA style.',
    'TheFEYA customization is limited: sizing, color/detail adjustments, length/coverage changes, and combinations of existing designs. Do not promise custom atelier work from scratch or unrelated styles.',
    'PDP mapping is required: use pdp_blocks to map text into current storefront areas: left_description for About this piece, right_info_panel for What is included / Sizing & Fit / Shipping & Delivery / Materials & Care / Customization / Returns & Exchanges / Handmade Variation, and faq_lower for extra FAQ only when useful.',
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
    'Required copy limits:',
    '- seo_title: 45-68 characters. One clear search angle only. Do not concatenate all keywords. Do not use Edition.',
    '- h1: 45-82 characters. Human-readable product name, not a keyword dump. Do not use Edition.',
    '- meta_description: 125-158 characters. Sell the product identity and differentiator, then use case. Do not merely say what is in the center of the image.',
    '- intro: 2-4 sentences. Lead with authorial design, visual impact, buyer benefit, event/use case, and then product facts. Do not start with what the image shows or what the set includes.',
    '- bullet_highlights: decision bullets for the buyer, not audit notes.',
    '- FAQ answers: concise, factual, purchase-helping answers about sizing, shipping, production, materials/care, customization, color, returns/exchanges, and what is included.',
    '- image_alt_candidates: only visible product facts. Use needs_image_review when the image fact is not certain.',
    '- visual_truth: factual visual analysis only; this is internal evidence, not customer sales copy.',
    '- pdp_blocks: map the generated copy to the actual storefront sections. Keep blocks concise and useful.',
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
    'PDP blocks must map output into the existing storefront layout instead of creating another screen.',
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
