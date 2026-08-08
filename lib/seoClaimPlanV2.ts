import type {
  SeoAgentInputContract,
  SeoAgentOutputContract,
  SeoKeywordRoleItem,
} from './seoPackContract.ts';
import type { SeoAgentPromptContract } from './seoAgentDraftPrompt.ts';
import { SEO_EDITORIAL_MEMORY_V3 } from './seoEditorialMemory.ts';
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
  body_identity_variant_en: string;
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
  situation: string;
};

export type SeoWriterBriefV4 = {
  contract_version: 'seo_writer_brief_v4';
  page_type: 'product_detail_page';
  product_context: {
    title: string;
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
  editorial_reference: 'seo_editorial_memory_v3';
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

export type SeoWriterBriefPreflight = {
  ok: boolean;
  issues: Array<{ code: string; message: string }>;
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
  const selectedContext = selectedEvents[0] || selectedStyles[0] || selectedPersonas[0] || 'its intended use';
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
    buyer_outcome_en: buyerOutcomeForFact(fact.fact_code),
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
    body_identity_variant_en: bodyIdentityVariant(productIdentity, familyProfile),
    buyer_job_en: buyerJobForFocus(
      productIdentity,
      familyProfile,
      selectedContext,
      selectedEvents,
      selectedStyles,
      selectedPersonas,
    ),
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
): {
  prompt: SeoAgentPromptContract;
  evidence: SeoProductFactSheet;
  brief: SeoWriterBriefV4;
  preflight: SeoWriterBriefPreflight;
} {
  const evidence = buildCurrentSeoProductEvidence(input);
  const claimPlan = buildDeterministicSeoClaimPlan(input, evidence);
  const readiness = {
    mode: options.readiness?.mode || 'READY_FULL',
    allowed_customer_sections: options.readiness?.allowed_customer_sections || [],
    suppressed_customer_sections: options.readiness?.suppressed_customer_sections || [],
  };
  const compactFocus = compactManualFocus(input.manual_focus);
  const idealForPortraits = buildIdealForPortraits(compactFocus);
  const brief: SeoWriterBriefV4 = {
    contract_version: 'seo_writer_brief_v4',
    page_type: 'product_detail_page',
    product_context: {
      title: input.product.title,
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
    editorial_reference: SEO_EDITORIAL_MEMORY_V3.contract_version,
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

  const preflight = validateSeoWriterBriefPreflight(brief);
  return { prompt, evidence, brief, preflight };
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

const WRITER_VISIBLE_PROVENANCE_PATTERN = /\b(?:owner[- ]approved|approved|confirmed|confirmation|story confirms?|product truth|current selector|source data|database|evidence|pre[- ]publication|internal review)\b/i;
const DISALLOWED_BRAND_STATUS_PATTERN = /\bindependent\s+(?:design\s+)?(?:team|studio|brand|company)\b/i;

/**
 * Zero-cost gate for the exact failure seen in the August pilot: internal
 * provenance sentences were copied as customer prose. Only string values are
 * inspected, so neutral JSON field names cannot create a false blocker.
 */
export function validateSeoWriterBriefPreflight(
  brief: SeoWriterBriefV4,
): SeoWriterBriefPreflight {
  const issues: SeoWriterBriefPreflight['issues'] = [];
  const values = collectStringValues({
    brief,
    positive_editorial_memory: SEO_EDITORIAL_MEMORY_V3,
  });

  values.forEach((value, index) => {
    if (WRITER_VISIBLE_PROVENANCE_PATTERN.test(value)) {
      issues.push({
        code: `writer_brief_internal_provenance_${index + 1}`,
        message: `Writer brief contains internal provenance language: ${value}`,
      });
    }
    if (DISALLOWED_BRAND_STATUS_PATTERN.test(value)) {
      issues.push({
        code: `writer_brief_independence_padding_${index + 1}`,
        message: `Writer brief uses independence as customer-facing brand padding: ${value}`,
      });
    }
  });

  return { ok: issues.length === 0, issues };
}

function compactWriterSystemPrompt() {
  const frames = SEO_EDITORIAL_MEMORY_V3.positive_block_frames;
  return [
    'You are the single product-copy writer for TheFEYA, a creative studio making original festival, stage, performance and costume fashion. Return one seo_agent_output_v1 JSON object and no commentary.',
    'Write warm, vivid, specific en-US ecommerce copy for real shoppers. Address the shopper as you outside Ideal for. The brief supplies every product fact, keyword and selected audience; never import another one from the examples.',
    'Use claim_plan as the complete feature-to-value map. Each claim appears once in its assigned block. buyer_outcome_en is a ready-to-use customer-facing sentence: prefer it verbatim when it fits, or make only a light grammatical adaptation. When fact_statement_en and buyer_outcome_en express the same finish idea, write the clearer one once; never paraphrase both into consecutive sentences. Never mention approval, evidence, sources, databases or internal review.',
    'Present one whole product. Use the exact reviewed Primary once in SEO title, once in H1 and once in meta. Use claim_plan.body_identity_variant_en in Intro and as the product phrase in ALT so the body stays clear without repeating the exact Primary.',
    'product_context.family_profile is internal routing metadata. Never write multi-component outfit, multi-component costume, multi-component product, multi-component set or multi-component silhouette in customer copy.',
    'Treat focus labels as concepts and inflect them into idiomatic English. For a generic festival use, write “for festivals” or a natural festival modifier, never the bare suffix “for Festival”.',
    'SEO title is at most 68 characters. H1 is at most 82. Meta is one direct grammatical sentence: exact Primary, one differentiator from claim_plan, then one natural occasion phrase from operator_confirmed_focus.event. When that phrase is “festivals and cosplay”, end the context there; never append “and an original ... character”. Keep Meta useful and at most 158 characters; do not pad it to a minimum.',
    'Intro is one natural 20-45 word sentence built from claim_plan.buyer_job_en and body_identity_variant_en. Keep assigned design and material claims for their target blocks so Intro and About do different jobs.',
    'About this piece is 40-60 words in 2-3 concrete sentences following the positive frame. Use the assigned About claim once: combine its fact and buyer result naturally instead of repeating glossy, mirror-like, metallic or polished-finish language across sentences. Never name or list confirmed_component_labels here; What’s Included already owns that inventory.',
    'Why you’ll love it is 3-4 concise bullets, one for each assigned why claim. Reuse a buyer_outcome_en sentence when it already reads naturally. Purchase configuration is code-owned and stays in What’s Included.',
    'Ideal for is 4-5 distinct bullets written from ideal_for_portraits. Vary sentence rhythm; do not repeat “who need” or another identical frame. If cosplay_positioning is present, present an original studio character without promising a replica.',
    'Designed for self-expression is the final block. Its block_key is exactly main_description and placement is exactly left_description; related_collections/review_only is not a substitute. Write 45-75 words in 3-4 natural sentences, use we/our studio voice rather than I/me, include exactly one TheFEYA mention, explain original-design purpose and close with the plain outcome “make the look your own”. Do not sell independence as a benefit or use abstract phrases such as distinctive presence or point of view.',
    'Code owns What’s Included, the right panel, bullet_highlights, FAQ and internal links. Return bullet_highlights, faq and internal_linking_hints as empty arrays, generate no What’s Included PDP block, and add no optional related_collections/review_only block.',
    'Return exactly one image_alt_candidate for the supplied primary image. Lead with a visible color plus claim_plan.body_identity_variant_en, never product_identity_en, then add one short pose or setting detail. The claim plan remains the authority for finish wording and customer promises.',
    'Use finish adjectives literally from claim_plan. Glossy, mirror-like or metal-like language never becomes reflective or retroreflective unless the claim itself says so.',
    'When cosplay_positioning is present, describe the authorial character positively: an original studio interpretation that helps the wearer create a character of their own.',
    `POSITIVE INTRO FRAME: ${frames.intro}`,
    `POSITIVE ABOUT FRAME: ${frames.about_this_piece}`,
    `POSITIVE WHY FRAMES: ${frames.why_youll_love_it.join(' | ')}`,
    `POSITIVE IDEAL FRAMES: ${frames.ideal_for.join(' | ')}`,
    `POSITIVE FINAL STUDIO FRAME: ${frames.studio_close}`,
    'When the claim plan cannot support a useful section, return needs_review instead of adding filler.',
  ].join('\n');
}

function buyerOutcomeForFact(factCode: string) {
  const outcomes: Record<string, string> = {
    original_authorial_design: 'Our original studio design helps you create a character that feels personal.',
    material_glossy_mirror_coating: 'The glossy, mirror-like surface gives the costume a polished metal finish.',
    material_thermoformed_liquid_metal: 'The smooth liquid-metal effect gives the design a polished finish.',
    material_body_comfort: 'The material feels comfortable against the body, making the costume easier to wear through longer events or performances.',
    material_shape_retention: 'The material helps the costume keep its shape between wears, so it is ready for the next occasion.',
    material_event_light_camera: 'The color and details stay clear in photos and under stage lighting.',
    current_color: 'One concrete visual detail that helps the shopper picture the piece.',
  };
  return outcomes[factCode] || 'One plain, useful result for the wearer.';
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
  focus: SeoWriterBriefV4['operator_confirmed_focus'],
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
      situation: `planning a ${festivalDescriptor} look for ${isBurningMan ? 'long days and night sets' : 'a long day of music and movement'}`,
    });
  }

  if (hasFocus(focus.event, 'cosplay')) {
    const selectedStyleIdeas = [primaryStyle, secondaryStyle].filter(Boolean).join(' or ');
    const characterIdea = selectedStyleIdeas
      ? selectedStyleIdeas
      : persona
        ? persona
        : 'studio-designed';
    portraits.push({
      person: 'cosplayers',
      situation: `building an original ${characterIdea} character around a studio-designed costume`,
    });
  }

  if (hasFocus([...focus.persona, ...focus.audience], 'performer')) {
    portraits.push({
      person: 'live performers',
      situation: `preparing a ${persona || primaryStyle || 'studio-designed'} look for a stage show or theatrical role`,
    });
  }

  const selectedProfessionalRole = focus.audience.find((value) => /dancer|\bdj\b|actor|artist|creator|stylist/i.test(value));
  if (selectedProfessionalRole) {
    portraits.push({
      person: pluralRole(selectedProfessionalRole),
      situation: `planning a recognizable ${primaryStyle || persona || 'studio-designed'} look for a live performance or production`,
    });
  }

  portraits.push(
    {
      person: 'content creators',
      situation: `planning ${secondaryStyle || persona || primaryStyle || 'distinctive'} visuals for ${creatorContext} shoots or music videos`,
    },
    {
      person: 'costume stylists',
      situation: `sourcing an original ${primaryStyle || persona || 'distinctive'} piece for themed shows or editorials`,
    },
  );

  if (portraits.length < 4) {
    portraits.push({
      person: 'show artists',
      situation: `developing a personal ${secondaryStyle || persona || primaryStyle || 'studio-designed'} look for a live production`,
    });
  }

  return uniqueBy(portraits, (portrait) => portrait.person.toLowerCase()).slice(0, 5);
}

function buyerJobForFocus(
  productIdentity: string,
  familyProfile: SeoDeterministicClaimPlan['family_profile'],
  selectedContext: string,
  selectedEvents: string[],
  selectedStyles: string[],
  selectedPersonas: string[],
) {
  const wholeProduct = bodyIdentityVariant(productIdentity, familyProfile);
  if (hasFocus(selectedEvents, 'cosplay')) {
    const character = [
      selectedStyles.slice(0, 2).join(' or '),
      selectedPersonas.find((value) => (
        !/performer/i.test(value)
        && !includesIdentityToken(productIdentity, value)
      )),
    ]
      .filter(Boolean)
      .join(' ')
      .trim() || 'distinctive';
    return `This ${wholeProduct} is made for ${buyerContextPhrase(selectedEvents, selectedStyles, selectedPersonas, selectedContext)}, giving you a starting point for an original ${character} character.`;
  }
  return `This ${wholeProduct} is made for ${buyerContextPhrase(selectedEvents, selectedStyles, selectedPersonas, selectedContext)}, giving you an original studio look you can make your own.`;
}

function buyerContextPhrase(
  selectedEvents: string[],
  selectedStyles: string[],
  selectedPersonas: string[],
  fallback: string,
) {
  if (selectedEvents.length) {
    return humanJoin(selectedEvents.map((value) => {
      if (/^festival$/i.test(value)) return 'festivals';
      if (/^stage$/i.test(value)) return 'the stage';
      return value;
    }));
  }
  if (selectedStyles.length) {
    return `${/^[aeiou]/i.test(selectedStyles[0]) ? 'an' : 'a'} ${humanJoin(selectedStyles.slice(0, 2), 'or')} look`;
  }
  if (selectedPersonas.length) {
    return `${/^[aeiou]/i.test(selectedPersonas[0]) ? 'an' : 'a'} ${humanJoin(selectedPersonas.slice(0, 2), 'or')} character`;
  }
  return fallback;
}

function humanJoin(values: string[], conjunction = 'and') {
  const clean = unique(values.map((value) => String(value || '').trim()).filter(Boolean));
  if (clean.length <= 1) return clean[0] || 'its intended use';
  if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, ${conjunction} ${clean.at(-1)}`;
}

function bodyIdentityVariant(
  productIdentity: string,
  familyProfile: SeoDeterministicClaimPlan['family_profile'],
) {
  const normalized = String(productIdentity || '').replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return familyProfile === 'single_component' ? 'distinctive piece' : 'complete outfit';
  }
  if (/\bcostume\b/i.test(normalized)) return normalized.replace(/\bcostume\b/i, 'outfit');
  if (/\boutfit\b/i.test(normalized)) return normalized.replace(/\boutfit\b/i, 'costume');
  if (/\b(?:set|ensemble|attire)\b/i.test(normalized)) {
    return normalized.replace(/\b(?:set|ensemble|attire)\b/i, 'outfit');
  }
  if (familyProfile === 'single_component') return reorderSingleComponentIdentity(normalized);
  return `complete ${normalized}`;
}

function reorderSingleComponentIdentity(value: string) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length < 2) return value;
  const [modifier, ...productWords] = words;
  const product = productWords.join(' ');
  if (/^festival$/i.test(modifier)) return `${product} for festivals`;
  if (/^(?:black|white|gold|silver|red|blue|green|pink|purple|brown|metallic)$/i.test(modifier)) {
    return `${product} in ${modifier}`;
  }
  if (/^(?:shoulder|arm|leg|head|waist|neck|chest)$/i.test(modifier)) {
    return `${product} for the ${modifier}`;
  }
  return `${product} for a ${modifier} look`;
}

function includesIdentityToken(identity: string, value: string) {
  const identityTokens = new Set(String(identity || '').toLowerCase().match(/[a-z0-9]+/g) || []);
  const valueTokens = String(value || '').toLowerCase().match(/[a-z0-9]+/g) || [];
  return valueTokens.some((token) => identityTokens.has(token));
}

function collectStringValues(value: unknown): string[] {
  if (typeof value === 'string') return value.trim() ? [value.trim()] : [];
  if (Array.isArray(value)) return value.flatMap(collectStringValues);
  if (!value || typeof value !== 'object') return [];
  return Object.values(value as Record<string, unknown>).flatMap(collectStringValues);
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
