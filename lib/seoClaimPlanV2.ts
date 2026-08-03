import type {
  SeoAgentInputContract,
  SeoAgentOutputContract,
  SeoKeywordRoleItem,
} from './seoPackContract.ts';
import type { SeoAgentPromptContract } from './seoAgentDraftPrompt.ts';
import { summarizeThefeyaSeoDoctrine } from './thefeyaSeoDoctrine.ts';
import {
  buildCurrentSeoProductEvidence,
  type SeoProductEvidenceFact,
  type SeoProductFactSheet,
} from './seoProductFactSheet.ts';

export type SeoClaimTargetBlock =
  | 'intro'
  | 'about_this_piece'
  | 'why_youll_love_it'
  | 'ideal_for'
  | 'main_description';

export type SeoClaimPlanItem = {
  claim_id: string;
  fact_code: string;
  fact_statement_en: string;
  buyer_outcome_en: string;
  target_block: SeoClaimTargetBlock;
};

export type SeoDeterministicClaimPlan = {
  contract_version: 'seo_claim_plan_v2';
  product_identity_en: string;
  buyer_job_en: string;
  family_profile: 'multi_component_outfit' | 'single_component' | 'whole_product';
  claims: SeoClaimPlanItem[];
};

export type SeoWriterBriefV2 = {
  contract_version: 'seo_writer_brief_v2';
  page_type: 'product_detail_page';
  product_identity: {
    canonical_product_id: string;
    matched_etsy_listing_id: string | null;
    title: string;
    material: string | null;
    color: string | null;
  };
  current_sellable_offer: SeoAgentInputContract['product']['sellable_offer'];
  operator_confirmed_focus: {
    component: string[];
    material: string[];
    event: string[];
    style: string[];
    persona: string[];
    audience: string[];
    exclude: string[];
  };
  approved_keywords: {
    primary: SeoKeywordRoleItem[];
    secondary: SeoKeywordRoleItem[];
    support: SeoKeywordRoleItem[];
    image_alt: SeoKeywordRoleItem[];
  };
  current_confirmed_writer_facts: SeoProductEvidenceFact[];
  excluded_legacy_evidence: Array<Pick<SeoProductEvidenceFact, 'fact_code' | 'source' | 'publishable'>>;
  claim_plan: SeoDeterministicClaimPlan;
  family_style_profile: {
    profile: SeoDeterministicClaimPlan['family_profile'];
    positive_pattern: string;
  };
  already_covered_topics: string[];
  forbidden_claims: string[];
  vision_input_present: boolean;
  readiness: {
    mode: string;
    allowed_customer_sections: string[];
    suppressed_customer_sections: string[];
  };
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

const ALREADY_COVERED_TOPICS = [
  'sizing and fit instructions',
  'production time',
  'shipping and delivery',
  'material specification',
  'care instructions',
  'customization process',
];

export function buildDeterministicSeoClaimPlan(
  input: SeoAgentInputContract,
  evidence = buildCurrentSeoProductEvidence(input),
): SeoDeterministicClaimPlan {
  const offer = input.product.sellable_offer;
  const familyProfile = offer?.status === 'ready' && offer.component_labels.length > 1
    ? 'multi_component_outfit'
    : offer?.status === 'ready' && offer.component_labels.length === 1
      ? 'single_component'
      : 'whole_product';
  const selectedEvents = focusValues(input.manual_focus.event);
  const selectedStyles = focusValues(input.manual_focus.style);
  const selectedPersonas = focusValues(input.manual_focus.persona);
  const primary = firstKeyword(input.keyword_roles.primary);
  const productIdentity = primary || input.product.title || 'TheFEYA product';
  const selectedContext = selectedEvents[0] || selectedStyles[0] || selectedPersonas[0] || 'its approved use';
  const writerFacts = evidence.current_confirmed_facts.filter((fact) => (
    fact.publishable && fact.placement === 'writer'
  ));
  const preferredCodes = [
    'original_authorial_design',
    'material_glossy_mirror_coating',
    'material_thermoformed_liquid_metal',
    'material_body_comfort',
    'material_shape_retention',
    'material_event_light_camera',
    'current_color',
  ];
  const ordered = [...writerFacts].sort((left, right) => (
    rank(preferredCodes, left.fact_code) - rank(preferredCodes, right.fact_code)
  ));
  const selectedFacts = uniqueFactFamilies(ordered).slice(0, 4);
  const claims = selectedFacts.map((fact, index): SeoClaimPlanItem => ({
    claim_id: `claim_${index + 1}`,
    fact_code: fact.fact_code,
    fact_statement_en: fact.statement_en,
    buyer_outcome_en: buyerOutcomeForFact(fact.fact_code, selectedContext),
    target_block: selectedFacts.length >= 4 && index === 1
      ? 'about_this_piece'
      : 'why_youll_love_it',
  }));

  return {
    contract_version: 'seo_claim_plan_v2',
    product_identity_en: productIdentity,
    buyer_job_en: `Choose a distinctive ${productIdentity} for ${selectedContext} without unsupported promises or invented components.`,
    family_profile: familyProfile,
    claims,
  };
}

export function buildCompactSeoWriterPrompt(
  input: SeoAgentInputContract,
  options: {
    readiness?: {
      mode?: string;
      allowed_customer_sections?: string[];
      suppressed_customer_sections?: string[];
    };
    primaryImageUrl?: string | null;
  } = {},
): { prompt: SeoAgentPromptContract; evidence: SeoProductFactSheet; brief: SeoWriterBriefV2 } {
  const evidence = buildCurrentSeoProductEvidence(input);
  const claimPlan = buildDeterministicSeoClaimPlan(input, evidence);
  const readiness = {
    mode: options.readiness?.mode || 'READY_FULL',
    allowed_customer_sections: options.readiness?.allowed_customer_sections || [],
    suppressed_customer_sections: options.readiness?.suppressed_customer_sections || [],
  };
  const brief: SeoWriterBriefV2 = {
    contract_version: 'seo_writer_brief_v2',
    page_type: 'product_detail_page',
    product_identity: {
      canonical_product_id: input.canonical_product_id,
      matched_etsy_listing_id: input.matched_etsy_listing_id || null,
      title: input.product.title,
      material: input.product.material || null,
      color: input.product.color || null,
    },
    current_sellable_offer: input.product.sellable_offer || null,
    operator_confirmed_focus: compactManualFocus(input.manual_focus),
    approved_keywords: {
      primary: compactKeywords(input.keyword_roles.primary),
      secondary: compactKeywords(input.keyword_roles.secondary),
      support: compactKeywords(input.keyword_roles.support),
      image_alt: compactKeywords(input.keyword_roles.image_alt),
    },
    current_confirmed_writer_facts: evidence.current_confirmed_facts.filter((fact) => (
      fact.publishable && fact.placement === 'writer'
    )),
    excluded_legacy_evidence: evidence.legacy_candidate_facts.map((fact) => ({
      fact_code: fact.fact_code,
      source: fact.source,
      publishable: false,
    })),
    claim_plan: claimPlan,
    family_style_profile: {
      profile: claimPlan.family_profile,
      positive_pattern: positiveFamilyPattern(claimPlan.family_profile),
    },
    already_covered_topics: ALREADY_COVERED_TOPICS,
    forbidden_claims: unique([
      ...input.blocked_words.product_specific_exclusions.slice(0, 12),
      'The global language blacklist is enforced by deterministic QA and is not repeated in this prompt.',
      'unsupported component or purchase configuration',
      'legacy customization, sizing, engraving, rush-order or gift-packaging promise',
      'guaranteed attention, compliments, likes, followers or sales',
      'photography performance not explicitly confirmed by an owner-approved material story',
    ]),
    vision_input_present: Boolean(options.primaryImageUrl),
    readiness,
  };

  const guardrails = [
    'Product Truth and current storefront offer outrank legacy text, vision and keyword volume.',
    'OpenAI writes prose only; it does not choose facts, composition, keywords or promises.',
    'Do not output What’s Included or any fixed right-panel block.',
    'Every buyer benefit must trace to one claim_plan item.',
    'Legacy candidate evidence is diagnostic-only and never publishable.',
    'No automatic save, apply or publish action follows generation.',
  ];
  const prompt: SeoAgentPromptContract = {
    contract_version: 'seo_agent_prompt_v1',
    model_role: 'server_side_seo_draft_writer',
    output_contract_version: 'seo_agent_output_v1',
    system_prompt: compactWriterSystemPrompt(),
    user_prompt: [
      'Use this deterministic writer brief. It is the complete authority for this draft.',
      'The output JSON schema is supplied separately by the API request.',
      JSON.stringify(brief),
    ].join('\n'),
    doctrine_summary: summarizeThefeyaSeoDoctrine(),
    response_format: {
      type: 'json_schema',
      required_top_level_fields: REQUIRED_OUTPUT_FIELDS,
    },
    guardrails,
  };

  return { prompt, evidence, brief };
}

export function buildCompactSeoRepairPrompt(
  input: SeoAgentInputContract,
  currentOutput: SeoAgentOutputContract,
  issues: Array<Record<string, unknown>>,
  options: {
    readiness?: {
      mode?: string;
      allowed_customer_sections?: string[];
      suppressed_customer_sections?: string[];
    };
    primaryImageUrl?: string | null;
  } = {},
) {
  const base = buildCompactSeoWriterPrompt(input, options);
  const failedScopes = unique(issues.map((issue) => String(
    issue.field || issue.block_key || issue.code || 'unspecified_validation_issue',
  )));
  const repairInput = {
    contract_version: 'seo_targeted_repair_v1',
    failed_scopes: failedScopes,
    deterministic_issues: issues.map((issue) => ({
      code: issue.code || null,
      field: issue.field || issue.block_key || null,
      severity: issue.severity || null,
      message: issue.message || null,
      keyword: issue.keyword || null,
    })),
    current_output: currentOutput,
    writer_brief: base.brief,
  };
  const prompt: SeoAgentPromptContract = {
    ...base.prompt,
    system_prompt: [
      base.prompt.system_prompt,
      'TARGETED REPAIR MODE: this is one explicit human-requested repair, not an automatic editor.',
      'Repair only the fields or PDP blocks implicated by failed_scopes and deterministic_issues.',
      'Return the complete seo_agent_output_v1 object because the response schema requires it. Preserve non-failing content unless a listed issue proves it must change.',
      'Do not add a new claim, fact, keyword role, component, audience or promise. Do not shorten a useful section merely to avoid an issue.',
    ].join('\n'),
    user_prompt: [
      'Perform exactly one targeted repair using this payload.',
      JSON.stringify(repairInput),
    ].join('\n'),
    guardrails: [
      ...base.prompt.guardrails,
      'Repair is allowed only after an explicit user action and is never retried automatically.',
    ],
  };

  return { ...base, prompt, failedScopes };
}

function compactWriterSystemPrompt() {
  return [
    'You are the single product-copy writer for TheFEYA. Return one seo_agent_output_v1 JSON object and no commentary.',
    'Write natural en-US ecommerce copy for a human buyer. Facts, composition, keyword roles and focus axes are already decided in the brief; never change or extend them.',
    'Use only current_confirmed_writer_facts and claim_plan for customer claims. excluded_legacy_evidence is never publishable.',
    'The current_sellable_offer is the only composition authority. Full Set is an aggregate purchase option, not a physical item or keyword entity.',
    'Vision may populate visual_truth and factual ALT observations only. It never proves a sellable component, material, fit, service or commercial promise.',
    'Keep the page entity whole-product-first. Use the exact approved Primary naturally in SEO title, H1 and meta only, with no more than three exact occurrences total.',
    'Use Secondary/supporting vocabulary only where it improves a natural sentence. Logic beats keyword placement; never target density.',
    'SEO title: at most 68 characters. H1: at most 82. Meta: 110-158 characters. Intro: one or two useful sentences answering what it is, its approved use and buyer result.',
    'Do not inventory components in intro, About, Why, Ideal for or the studio close. The deterministic What’s Included block owns composition and purchase-option wording.',
    'About this piece: 2-4 concrete sentences. Start from the buyer job, then use at most one supported product/material value not owned by another block.',
    'Why you’ll love it: use every why_youll_love_it claim exactly once, normally 3-4 bullets. Each bullet is one supported feature followed by one clear buyer outcome.',
    'Ideal for: 3-5 distinct client portraits drawn only from operator-confirmed event/style/persona/audience axes and approved general roles. Name a real person/role plus a coherent occasion or need.',
    'Designed for self-expression: first-person studio voice, one TheFEYA mention, original design and self-expression. Never call the studio small.',
    'Return no generated What’s Included block and no fixed right-panel sizing, production, shipping, material-specification, care or customization instructions.',
    'FAQ is empty unless the brief provides a current confirmed fact that answers it without repeating the right panel. Do not invent internal links.',
    'Avoid robotic design-analysis language: silhouette, sculptural, structured shape, visual depth, upper-body line, reads clearly, creates presence, focal point, strong look, complete look, intentional look.',
    'Avoid hype and social promises: perfect, ultimate, premium, guaranteed attention, compliments, likes, followers, viral reach or sales.',
    'Do not use long dashes as a house style. Do not repeat the same idea across blocks.',
    'If evidence is insufficient, return status needs_review with fewer truthful claims; never fill space by invention.',
    'Silently check the finished JSON against the brief before returning it.',
  ].join('\n');
}

function positiveFamilyPattern(profile: SeoDeterministicClaimPlan['family_profile']) {
  if (profile === 'multi_component_outfit') {
    return 'Pattern only: identify the complete outfit and approved occasion; explain one verified design or material value; keep component inventory in the code-owned checklist.';
  }
  if (profile === 'single_component') {
    return 'Pattern only: identify the exact component and approved use; explain one verified feature-to-outcome value without pretending it is a full outfit.';
  }
  return 'Pattern only: identify the whole product and approved use; build each paragraph from a different confirmed fact-to-outcome claim.';
}

function buyerOutcomeForFact(factCode: string, selectedContext: string) {
  const outcomes: Record<string, string> = {
    original_authorial_design: `Give the buyer an original, recognizable option for ${selectedContext} without promising social reactions.`,
    material_glossy_mirror_coating: `Give the product a distinctive glossy finish for ${selectedContext}.`,
    material_thermoformed_liquid_metal: `Give the product a smooth liquid-metal effect suited to the approved context.`,
    material_body_comfort: `Support more comfortable extended wear during ${selectedContext}.`,
    material_shape_retention: 'Help the buyer keep the piece ready between wears.',
    material_event_light_camera: 'Support a strong visual result under event lighting and on camera without guaranteeing attention.',
    current_color: 'Help the buyer choose the confirmed color for the approved look.',
  };
  return outcomes[factCode] || 'Translate this confirmed fact into one plain, non-repeated buyer outcome.';
}

function compactKeywords(values: SeoKeywordRoleItem[]) {
  return (values || []).slice(0, 8).map((item) => ({
    keyword: item.keyword,
    keyword_norm: item.keyword_norm,
    role: item.role,
    placement: item.placement || null,
    role_reason: item.role_reason || null,
    avg_monthly_searches: item.avg_monthly_searches ?? null,
    competition: item.competition ?? null,
    metric_source: item.metric_source ?? null,
    last_checked: item.last_checked ?? null,
  })) as SeoKeywordRoleItem[];
}

function firstKeyword(values: SeoKeywordRoleItem[]) {
  const item = values?.[0];
  return String(item?.keyword || item?.keyword_norm || '').trim();
}

function focusValues(value: unknown) {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(values.map((item) => String(item || '').trim()).filter(Boolean));
}

function compactManualFocus(focus: SeoAgentInputContract['manual_focus']) {
  return {
    component: focusValues(focus.component),
    material: focusValues(focus.material),
    event: focusValues(focus.event),
    style: focusValues(focus.style),
    persona: focusValues(focus.persona),
    audience: focusValues(focus.audience),
    exclude: focusValues(focus.exclude),
  };
}

function uniqueFactFamilies(facts: SeoProductEvidenceFact[]) {
  const family = (factCode: string) => {
    if (factCode === 'original_authorial_design') return 'original_design';
    if (factCode.includes('body_comfort')) return 'wear_comfort';
    if (factCode.includes('shape_retention')) return 'shape_retention';
    if (factCode.includes('event_light_camera')) return 'camera_light';
    if (factCode.includes('liquid_metal') || factCode.includes('glossy_mirror')) return 'surface_finish';
    return factCode;
  };
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = family(fact.fact_code);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function rank(order: string[], value: string) {
  const index = order.indexOf(value);
  return index === -1 ? order.length : index;
}

function unique<T>(values: T[]) {
  return [...new Set(values)];
}
