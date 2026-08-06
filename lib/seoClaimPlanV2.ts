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
  blockers: string[];
};

type SeoWriterKeyword = {
  keyword: string;
  role: SeoKeywordRoleItem['role'];
  placement: string | null;
};

type SeoWriterSellableOffer = {
  contract_version: string;
  status: string;
  source: string | null;
  atomic_options: Array<{
    code: string;
    family: string | null;
    label: string;
  }>;
  aggregate_options: Array<{
    code: string;
    label: string;
    member_codes: string[];
    member_labels: string[];
  }>;
  component_labels: string[];
  default_configuration_code: string | null;
  default_included_components: string[];
  blockers: string[];
} | null;

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
  current_sellable_offer: SeoWriterSellableOffer;
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
    primary: SeoWriterKeyword[];
    secondary: SeoWriterKeyword[];
    support: SeoWriterKeyword[];
    image_alt: SeoWriterKeyword[];
  };
  current_confirmed_writer_facts: Array<Pick<SeoProductEvidenceFact, 'fact_code' | 'statement_en' | 'source'>>;
  excluded_legacy_evidence: Array<Pick<SeoProductEvidenceFact, 'fact_code' | 'source' | 'publishable'>>;
  claim_plan: SeoDeterministicClaimPlan;
  family_style_profile: {
    profile: SeoDeterministicClaimPlan['family_profile'];
    positive_pattern: string;
  };
  already_covered_topics: string[];
  ideal_for_allowed_labels: string[];
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
    fact.publishable
    && fact.placement === 'writer'
    && fact.fact_code !== 'current_product_identity'
  ));
  const preferredCodes = [
    'original_authorial_design',
    'material_glossy_mirror_coating',
    'material_thermoformed_liquid_metal',
    'material_body_comfort',
    'material_shape_retention',
    'material_event_light_camera',
    'current_purchase_flexibility',
    'current_color',
  ];
  const ordered = [...writerFacts].sort((left, right) => (
    rank(preferredCodes, left.fact_code) - rank(preferredCodes, right.fact_code)
  ));
  const aboutFact = ordered.find((fact) => [
    'material_glossy_mirror_coating',
    'material_thermoformed_liquid_metal',
    'current_color',
  ].includes(fact.fact_code)) || null;
  const whyFacts = uniqueFactFamilies(ordered.filter((fact) => [
    'original_authorial_design',
    'material_body_comfort',
    'material_shape_retention',
    'material_event_light_camera',
    'current_purchase_flexibility',
  ].includes(fact.fact_code))).slice(0, 4);
  const selectedClaims = [
    ...(aboutFact ? [{ fact: aboutFact, target_block: 'about_this_piece' as const }] : []),
    ...whyFacts.map((fact) => ({ fact, target_block: 'why_youll_love_it' as const })),
  ];
  const claims = selectedClaims.map(({ fact, target_block }, index): SeoClaimPlanItem => ({
    claim_id: `claim_${index + 1}`,
    fact_code: fact.fact_code,
    fact_statement_en: fact.statement_en,
    buyer_outcome_en: buyerOutcomeForFact(fact.fact_code, selectedContext),
    target_block,
  }));
  const blockers = [
    ...(!aboutFact ? ['claim_plan_missing_about_fact'] : []),
    ...(whyFacts.length < 3 ? ['claim_plan_insufficient_distinct_why_claims'] : []),
  ];

  return {
    contract_version: 'seo_claim_plan_v2',
    product_identity_en: productIdentity,
    buyer_job_en: `Choose a distinctive ${productIdentity} for ${selectedContext} and build a look that feels personal.`,
    family_profile: familyProfile,
    claims,
    blockers,
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
  const compactFocus = compactManualFocus(input.manual_focus);
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
    current_sellable_offer: compactSellableOffer(input.product.sellable_offer),
    operator_confirmed_focus: compactFocus,
    approved_keywords: {
      primary: compactKeywords(input.keyword_roles.primary),
      secondary: compactKeywords(input.keyword_roles.secondary),
      support: compactKeywords(input.keyword_roles.support),
      image_alt: compactKeywords(input.keyword_roles.image_alt),
    },
    current_confirmed_writer_facts: evidence.current_confirmed_facts
      .filter((fact) => (
        fact.publishable
        && fact.placement === 'writer'
        && fact.fact_code !== 'current_product_identity'
      ))
      .map((fact) => ({
        fact_code: fact.fact_code,
        statement_en: fact.statement_en,
        source: fact.source,
      })),
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
    ideal_for_allowed_labels: unique([
      ...compactFocus.event,
      ...compactFocus.style,
      ...compactFocus.persona,
      ...compactFocus.audience,
      'costume buyer',
      'customer',
    ]),
    forbidden_claims: unique([
      ...input.blocked_words.product_specific_exclusions.slice(0, 12),
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
    'Keep the page entity whole-product-first. Use the exact approved Primary naturally in SEO title, H1 and meta, with no more than three exact occurrences there.',
    'In intro or About, represent the Primary concept once through a natural semantic variation that preserves every meaningful descriptor and may swap only the whole-product noun, for example costume to outfit, set, ensemble or attire. Do not repeat the exact H1 phrase in body copy.',
    'Use Secondary/supporting vocabulary only where it improves a natural sentence. Logic beats keyword placement; never target density.',
    'SEO title: at most 68 characters. H1: at most 82. Meta: 110-158 characters. Intro: 20-45 words in one or two useful sentences answering what it is, its approved use and buyer result.',
    'Do not inventory component labels in intro, About, Why, Ideal for or the studio close. The deterministic What’s Included block owns exact composition. Only a current_purchase_flexibility claim may say once in Why that the confirmed pieces are available separately or together.',
    'Return bullet_highlights as []. Why you’ll love it is the only generated benefit list, so a second highlight list would duplicate claims.',
    'About this piece: 40-70 words in 2-4 concrete sentences. Start from the buyer job and whole-product identity, then use each about_this_piece claim exactly once. Do not use a why_youll_love_it claim here.',
    'Why you’ll love it: use every why_youll_love_it claim exactly once in 3-4 bullets. Each bullet is one supported feature followed by one clear buyer outcome. The design bullet should use the positive pattern “Our original studio design gives you a distinctive piece for a look that feels personal.”',
    'Only main_description may contain the word TheFEYA. Never use the brand name in intro, bullet_highlights, About, Why or Ideal for.',
    'Ideal for: 4-5 distinct client portraits. Use only ideal_for_allowed_labels and grammatical variants of those labels; do not invent another named role, event or subculture. Represent at least one value from every non-empty event, style, persona and audience axis. Each bullet names one person or role plus one approved occasion or need.',
    'Designed for self-expression: 45-75 words in 3-4 natural sentences. Use first-person studio voice, exactly one TheFEYA mention, an independent point of view, original design purpose, a complete supported look and one honest self-expression outcome. Never call the studio small.',
    'Return no generated What’s Included block and no fixed right-panel sizing, production, shipping, material-specification, care or customization instructions.',
    'Return faq and internal_linking_hints as empty arrays in this PDP phase.',
    'Use each claim_plan fact in only its assigned block. Do not repeat the same finish, comfort, shape-retention, design or purchase-flexibility idea in meta, intro or another block.',
    'Avoid robotic design-analysis language: silhouette, sculptural, structured shape, visual depth, upper-body line, reads clearly, creates presence, focal point, strong look, intentional look.',
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
    original_authorial_design: `Use one concrete design benefit: our original studio design gives the buyer a distinctive option for a ${selectedContext} look that feels personal.`,
    material_glossy_mirror_coating: 'Explain the confirmed glossy mirror-like coating as one concrete surface value in About this piece.',
    material_thermoformed_liquid_metal: 'Explain the confirmed smooth liquid-metal effect as one concrete surface value in About this piece.',
    material_body_comfort: 'Use one practical benefit: the confirmed material feels comfortable against the body, making longer wear easier.',
    material_shape_retention: 'Use one repeat-wear benefit: the material keeps its shape between wears, so the piece stays ready for future use.',
    material_event_light_camera: 'Use one verified finish benefit: the surface works under event lighting and on camera without promising attention or reactions.',
    current_purchase_flexibility: 'Use one purchase-flexibility benefit: the confirmed pieces are available separately or together, so the buyer can restyle the outfit for future use.',
    current_color: 'Ground About this piece in the confirmed color without turning color alone into a purchase benefit.',
  };
  return outcomes[factCode] || 'Translate this confirmed fact into one plain, non-repeated buyer outcome.';
}

function compactKeywords(values: SeoKeywordRoleItem[]): SeoWriterKeyword[] {
  return (values || []).slice(0, 8).map((item) => ({
    keyword: String(item.keyword || item.keyword_norm || '').trim(),
    role: item.role,
    placement: item.placement || null,
  })).filter((item) => item.keyword);
}

function compactSellableOffer(
  offer: SeoAgentInputContract['product']['sellable_offer'],
): SeoWriterSellableOffer {
  if (!offer) return null;
  return {
    contract_version: offer.contract_version,
    status: offer.status,
    source: offer.source || null,
    atomic_options: offer.atomic_options.map((option) => ({
      code: option.code,
      family: option.family || null,
      label: option.label,
    })),
    aggregate_options: offer.aggregate_options.map((option) => ({
      code: option.code,
      label: option.label,
      member_codes: option.member_codes,
      member_labels: option.member_labels,
    })),
    component_labels: offer.component_labels,
    default_configuration_code: offer.default_configuration_code || null,
    default_included_components: offer.default_included_components,
    blockers: offer.blockers,
  };
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
