import type {
  SeoAgentInputContract,
  SeoAgentOutputContract,
  SeoKeywordRoleItem,
} from './seoPackContract.ts';
import type { SeoAgentPromptContract } from './seoAgentDraftPrompt.ts';
import { SEO_EDITORIAL_MEMORY_V1, type SeoEditorialMemoryV1 } from './seoEditorialMemory.ts';
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

type SeoIdealForPortrait = {
  person: string;
  approved_need: string;
};

export type SeoWriterBriefV3 = {
  contract_version: 'seo_writer_brief_v3';
  page_type: 'product_detail_page';
  product_context: {
    title: string;
    material: string | null;
    color: string | null;
    family_profile: SeoDeterministicClaimPlan['family_profile'];
    confirmed_component_labels: string[];
  };
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
  claim_plan: SeoDeterministicClaimPlan;
  editorial_memory: SeoEditorialMemoryV1;
  ideal_for_portraits: SeoIdealForPortrait[];
  cosplay_positioning: string | null;
  code_owned_sections: string[];
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

const CODE_OWNED_SECTIONS = [
  'whats_included',
  'right_panel',
  'bullet_highlights',
  'faq',
  'internal_linking_hints',
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
  const compactFocus = compactManualFocus(input.manual_focus);
  const idealForPortraits = buildIdealForPortraits(compactFocus);
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
    ...(idealForPortraits.length < 4 ? ['ideal_for_portraits_insufficient'] : []),
  ];

  return {
    contract_version: 'seo_claim_plan_v2',
    product_identity_en: productIdentity,
    buyer_job_en: buyerJobForFocus(productIdentity, selectedContext, selectedEvents, selectedStyles, selectedPersonas),
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
): { prompt: SeoAgentPromptContract; evidence: SeoProductFactSheet; brief: SeoWriterBriefV3 } {
  const evidence = buildCurrentSeoProductEvidence(input);
  const claimPlan = buildDeterministicSeoClaimPlan(input, evidence);
  const readiness = {
    mode: options.readiness?.mode || 'READY_FULL',
    allowed_customer_sections: options.readiness?.allowed_customer_sections || [],
    suppressed_customer_sections: options.readiness?.suppressed_customer_sections || [],
  };
  const compactFocus = compactManualFocus(input.manual_focus);
  const idealForPortraits = buildIdealForPortraits(compactFocus);
  const brief: SeoWriterBriefV3 = {
    contract_version: 'seo_writer_brief_v3',
    page_type: 'product_detail_page',
    product_context: {
      title: input.product.title,
      material: input.product.material || null,
      color: input.product.color || null,
      family_profile: claimPlan.family_profile,
      confirmed_component_labels: input.product.sellable_offer?.status === 'ready'
        ? input.product.sellable_offer.component_labels
        : [],
    },
    operator_confirmed_focus: compactFocus,
    approved_keywords: {
      primary: compactKeywords(input.keyword_roles.primary, 1),
      secondary: compactKeywords(input.keyword_roles.secondary, 5),
      support: compactKeywords(input.keyword_roles.support, 4),
      image_alt: compactKeywords(input.keyword_roles.image_alt, 4),
    },
    claim_plan: claimPlan,
    editorial_memory: SEO_EDITORIAL_MEMORY_V1,
    ideal_for_portraits: idealForPortraits,
    cosplay_positioning: hasFocus(compactFocus.event, 'cosplay')
      ? "Frame cosplay as an original studio interpretation that helps the buyer create a character of their own."
      : null,
    code_owned_sections: CODE_OWNED_SECTIONS,
    vision_input_present: Boolean(options.primaryImageUrl),
    readiness,
  };

  const guardrails = [
    'Product Truth and current storefront offer outrank legacy text, vision and keyword volume.',
    'OpenAI writes prose only; it does not choose facts, composition, keywords or promises.',
    'Every buyer benefit must trace to one claim_plan item.',
    'Code-owned sections stay outside generated prose.',
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
    'Write warm, specific en-US ecommerce copy. Follow editorial_memory for rhythm and block logic; its placeholders are a writing pattern, while this brief supplies every product fact and focus.',
    'Use claim_plan as the complete fact-to-block map. Each claim appears once in its assigned block as a supported feature followed by one concrete buyer outcome.',
    'Present one whole product. Use the approved Primary naturally in SEO title, H1 and meta; use a normal whole-product variation in body copy. Secondary vocabulary is optional when it makes the sentence more useful.',
    'SEO title is at most 68 characters. H1 is at most 82. Meta is 110-158 characters. Intro is 20-45 words and says what the product is, where it belongs and why that matters to the buyer.',
    'About this piece is 40-70 words in 2-4 concrete sentences: begin with the buyer job and whole-product identity, then use the assigned about claim once.',
    'Why you’ll love it is 3-4 concise bullets, one for each assigned why claim. Purchase configuration is code-owned and stays in What’s Included, not in generated benefits.',
    'Ideal for is 4-5 distinct bullets written from ideal_for_portraits. Each bullet names one person or professional role and one approved occasion or need. If cosplay_positioning is present, use that positive original-studio framing.',
    'Designed for self-expression is 45-75 words in 3-4 natural sentences. Use first-person studio voice, exactly one TheFEYA mention, the independent point of view, original-design purpose and an honest self-expression outcome.',
    'Code owns What’s Included, the right panel, bullet_highlights, FAQ and internal links. Return bullet_highlights, faq and internal_linking_hints as empty arrays and generate no What’s Included PDP block.',
    'Keep confirmed_component_labels in visual_truth and factual ALT only. An image may describe visible color, form and scene, but the claim plan remains the authority for customer promises.',
    'When the claim plan cannot support a useful section, return needs_review instead of adding filler.',
  ].join('\n');
}

function buyerOutcomeForFact(factCode: string, selectedContext: string) {
  const outcomes: Record<string, string> = {
    original_authorial_design: `This is an original studio design, giving the buyer a distinctive ${selectedContext} look that feels like their own.`,
    material_glossy_mirror_coating: 'The glossy, mirror-like coating gives the product its confirmed metal-like surface.',
    material_thermoformed_liquid_metal: 'The smooth, liquid-metal effect gives the product its confirmed metal-like surface.',
    material_body_comfort: 'The material feels comfortable against the body, making longer wear easier.',
    material_shape_retention: 'It keeps its shape between wears, so it comes out of storage ready for the next occasion.',
    material_event_light_camera: 'The finish catches available light, so its color and details come through in photos and under stage lighting.',
    current_color: 'Use the confirmed color once to make the description concrete.',
  };
  return outcomes[factCode] || 'Translate this confirmed fact into one plain, non-repeated buyer outcome.';
}

function compactKeywords(values: SeoKeywordRoleItem[], limit: number): SeoWriterKeyword[] {
  return (values || []).slice(0, limit).map((item) => ({
    keyword: String(item.keyword || item.keyword_norm || '').trim(),
    role: item.role,
    placement: item.placement || null,
  })).filter((item) => item.keyword);
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

function buildIdealForPortraits(
  focus: SeoWriterBriefV3['operator_confirmed_focus'],
): SeoIdealForPortrait[] {
  const hasCommercialFocus = [focus.event, focus.style, focus.persona, focus.audience]
    .some((values) => values.length > 0);
  if (!hasCommercialFocus) return [];

  const portraits: SeoIdealForPortrait[] = [];
  const festivalEvent = focus.event.find((value) => !/cosplay/i.test(value));
  const primaryStyle = focus.style[0] || '';
  const secondaryStyle = focus.style[1] || '';
  const persona = focus.persona.find((value) => !/performer/i.test(value)) || '';
  const festivalDescriptor = persona || primaryStyle || 'studio-designed';
  const creatorContext = festivalEvent || focus.event[0] || primaryStyle || persona || 'live production';

  if (festivalEvent) {
    const isBurningMan = /burning man/i.test(festivalEvent);
    portraits.push({
      person: isBurningMan ? 'Burning Man attendees' : 'festival-goers',
      approved_need: `choosing an original ${festivalDescriptor} look for ${isBurningMan ? 'long days and night sets' : 'a long day of music and movement'}`,
    });
  }

  if (hasFocus(focus.event, 'cosplay')) {
    const inspiration = [primaryStyle, secondaryStyle].filter(Boolean).join(' or ') || persona || 'character-led ideas';
    portraits.push({
      person: 'cosplayers',
      approved_need: `creating a character of their own through an original studio interpretation inspired by ${inspiration}`,
    });
  }

  if (hasFocus([...focus.persona, ...focus.audience], 'performer')) {
    portraits.push({
      person: 'live performers',
      approved_need: `preparing an original ${persona || primaryStyle || 'studio-designed'} costume for a stage set or character-led production`,
    });
  }

  const selectedProfessionalRole = focus.audience.find((value) => /dancer|\bdj\b|actor|artist|creator|stylist/i.test(value));
  if (selectedProfessionalRole) {
    portraits.push({
      person: pluralRole(selectedProfessionalRole),
      approved_need: `building a recognizable ${primaryStyle || persona || 'studio-designed'} look for the selected performance or production`,
    });
  }

  portraits.push(
    {
      person: 'content creators',
      approved_need: `planning ${creatorContext} visuals around an original ${secondaryStyle || persona || primaryStyle || 'character'} look`,
    },
    {
      person: 'costume stylists',
      approved_need: `sourcing an original ${primaryStyle || persona || 'character'} design from an independent studio for themed shows or shoots`,
    },
  );

  if (portraits.length < 4) {
    portraits.push({
      person: 'show artists',
      approved_need: `developing a personal ${secondaryStyle || persona || primaryStyle || 'studio-designed'} look for a live production`,
    });
  }

  return uniqueBy(portraits, (portrait) => portrait.person.toLowerCase()).slice(0, 5);
}

function buyerJobForFocus(
  productIdentity: string,
  selectedContext: string,
  selectedEvents: string[],
  selectedStyles: string[],
  selectedPersonas: string[],
) {
  if (hasFocus(selectedEvents, 'cosplay')) {
    const character = [selectedStyles.slice(0, 2).join(' or '), selectedPersonas.find((value) => !/performer/i.test(value))]
      .filter(Boolean)
      .join(' ')
      .trim() || 'original';
    return `Help the buyer create a ${character} character of their own with an original ${productIdentity}.`;
  }
  return `Help the buyer choose an original ${productIdentity} for ${selectedContext} that feels personal and works for the real occasion.`;
}

function pluralRole(value: string) {
  const role = value.trim();
  if (/s$/i.test(role)) return role;
  if (/\bdj\b/i.test(role)) return 'DJs';
  return `${role}s`;
}

function hasFocus(values: string[], expected: string) {
  const normalizedExpected = expected.toLowerCase();
  return values.some((value) => value.toLowerCase() === normalizedExpected);
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const current = key(value);
    if (seen.has(current)) return false;
    seen.add(current);
    return true;
  });
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
