import type {
  SeoAgentInputContract,
  SeoAgentOutputContract,
  SeoKeywordRoleItem,
} from './seoPackContract.ts';
import type { SeoAgentPromptContract } from './seoAgentDraftPrompt.ts';
import { SEO_EDITORIAL_MEMORY_V6 } from './seoEditorialMemory.ts';
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
  usage_constraint: SeoKeywordRoleItem['usage_constraint'];
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
  editorial_reference: 'seo_editorial_memory_v6';
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
    'material_glossy_holographic_shift',
    'material_glossy_metal_inspired_finish',
    'material_glossy_latex_like_finish',
    'material_smooth_glossy_finish',
    'material_body_comfort',
    'material_shape_retention',
    'material_event_light_camera',
    'current_color',
  ];
  const ordered = [...writerFacts].sort((left, right) => (
    rank(preferredCodes, left.fact_code) - rank(preferredCodes, right.fact_code)
  ));
  const aboutFact = ordered.find((fact) => [
    'material_glossy_holographic_shift',
    'material_glossy_metal_inspired_finish',
    'material_glossy_latex_like_finish',
    'material_smooth_glossy_finish',
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
    editorial_reference: SEO_EDITORIAL_MEMORY_V6.contract_version,
    ideal_for_portraits: idealForPortraits,
    cosplay_positioning: hasFocus(compactFocus.event, 'cosplay')
      ? 'Frame cosplay as an original studio interpretation with a fashion-led treatment of the selected mood or persona, creating a distinctive character of their own. Never promise an exact character match or explain replica comparisons to the shopper.'
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
    positive_editorial_memory: SEO_EDITORIAL_MEMORY_V6,
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
  const frames = SEO_EDITORIAL_MEMORY_V6.positive_block_frames;
  return [
    'You are TheFEYA’s single product-copy writer. Return one seo_agent_output_v1 JSON object, no commentary.',
    'Write warm, vivid, specific en-US ecommerce copy. Use only the brief, claim_plan, approved keywords and selected focus; never expose evidence, approval, databases or review.',
    'Use each claim once in its assigned block. buyer_outcome_en is ready for customer copy; lightly inflect it, but do not repeat its fact_statement_en.',
    'Present one whole product. Exact Primary appears once in SEO title, H1 and Meta only. Intro and ALT use body_identity_variant_en. One safe whole-product Secondary may appear once in Intro or About.',
    'family_profile is internal. Inflect focus labels naturally: use “for festivals”, never the bare suffix “for Festival”.',
    'SEO title <=68; H1 <=82. Put confirmed color before Primary. Meta: one normal sentence, never ALL CAPS or Title Case, with Primary, one finish and one selected event, <=158 characters. Keep durability in Why. For “festivals and cosplay”, add no character padding.',
    'Intro: one 20-45 word sentence from buyer_job_en and body_identity_variant_en; save assigned design and finish claims for their blocks.',
    'About this piece: 45-60 words in 2-3 concrete sentences. Use one finish buyer_outcome_en. A multi-piece product remains an outfit/set/costume, but never recap two components; What’s Included owns inventory.',
    'Why you’ll love it: 3-4 concise bullets, one per assigned Why claim. Do not repeat purchase configuration.',
    'Ideal for: 4-5 varied ideal_for_portraits covering each selected axis naturally; any focus value appears at most twice.',
    'Designed for self-expression is the final main_description/left_description block: 45-75 words, 3-4 we/our sentences, TheFEYA once, original design purpose and body_identity_variant_en. Close on a distinctive, memorable character that feels personal. Never prescribe unsold styling.',
    'Code owns What’s Included, right panel, bullets, FAQ and links. Return bullet_highlights, faq, internal_linking_hints and visual_truth.open_style_suggestions as empty arrays. Generate no What’s Included block.',
    'Return exactly one image_alt_candidate: visible color + body_identity_variant_en + one short visible pose/setting detail; never product_identity_en.',
    'Follow claim_plan finish exactly: gold/silver may be metal-inspired; black/red/white may be sleek and latex-like; holographic is smooth, shiny and subtly color-shifting, never metallic.',
    'For holographic products, an approved Secondary/support term may appear once as an indirect aesthetic such as mirror-look, reflective-inspired or sparkling-inspired. Only use a term present in approved_keywords; never call the material reflective, retroreflective, mirrored or sparkling.',
    'A keyword marked indirect_discovery_alias is adjacent search vocabulary only. If used, frame it indirectly for shoppers browsing that category while naming the actual product truthfully; never turn the alias into the product entity or an included-item claim.',
    'Use evidence-linked positive modifiers sparingly: striking, distinctive, glamorous, memorable, beautifully polished or excellent shape retention. Avoid empty superlatives.',
    'Never write “structured material”, “visual identity”, “silhouette”, “starting point”, “final look open to your choices”, or imply that the sold garment is unfinished, transformable or awaiting a final version.',
    'For cosplay, use an original fashion-led studio interpretation. Never promise an exact character match or discuss replica comparisons.',
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
    original_authorial_design: 'Created by our designers, the original design gives the outfit a distinctive, memorable character that feels personal.',
    material_glossy_holographic_shift: 'Its smooth, shiny holographic surface shows subtle color shifts in changing light and movement.',
    material_glossy_metal_inspired_finish: 'Its smooth, high-gloss surface creates a beautifully polished, metal-inspired finish.',
    material_glossy_latex_like_finish: 'Its smooth, high-gloss surface creates a sleek, latex-like appearance.',
    material_smooth_glossy_finish: 'Its smooth, high-gloss surface gives the piece a clean, polished finish.',
    material_body_comfort: 'The material feels comfortable against the body, making the garment easier to wear for extended periods.',
    material_shape_retention: 'With careful storage, the piece keeps its shape beautifully between wears and stays ready for future events.',
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
    usage_constraint: item.usage_constraint || null,
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
  const festivalDescriptor = persona || primaryStyle || 'designer-made';
  const creatorContext = festivalEvent || focus.event[0] || primaryStyle || persona || 'live production';

  const generalAudience = focus.audience.find((value) => (
    /^(?:women|woman|men|man|couples?|female|male)$/i.test(value.trim())
  ));
  if (generalAudience) {
    portraits.push({
      person: audiencePerson(generalAudience),
      situation: 'seeking an expressive outfit for a live music production',
    });
  }

  if (festivalEvent) {
    const isBurningMan = /burning man/i.test(festivalEvent);
    portraits.push({
      person: isBurningMan ? 'Burning Man attendees' : 'festival-goers',
      situation: `drawn to a ${festivalDescriptor} look for ${isBurningMan ? 'long days and night sets' : 'a long day of music and movement'}`,
    });
  }

  if (hasFocus(focus.event, 'cosplay')) {
    const selectedStyleIdeas = [primaryStyle, secondaryStyle].filter(Boolean).join(' or ');
    const characterIdea = selectedStyleIdeas
      ? selectedStyleIdeas
      : persona
        ? persona
        : 'designer-made';
    portraits.push({
      person: 'cosplayers',
      situation: `creating an original ${characterIdea} character for cosplay appearances or themed productions`,
    });
  }

  if (hasFocus([...focus.persona, ...focus.audience], 'performer')) {
    portraits.push({
      person: 'live performers',
      situation: `choosing a ${persona || primaryStyle || 'designer-made'} look for a stage show or theatrical role`,
    });
  }

  const selectedProfessionalRole = focus.audience.find((value) => /dancer|\bdj\b|actor|artist|creator|stylist/i.test(value));
  if (selectedProfessionalRole) {
    portraits.push({
      person: pluralRole(selectedProfessionalRole),
      situation: `seeking a recognizable ${primaryStyle || persona || 'designer-made'} look for a live performance or production`,
    });
  }

  portraits.push(
    {
      person: 'content creators',
      situation: `producing ${secondaryStyle || persona || primaryStyle || 'distinctive'} visuals for ${creatorContext} shoots or music videos`,
    },
    {
      person: 'costume stylists',
      situation: `selecting an original ${primaryStyle || persona || 'distinctive'} design for themed shows or editorials`,
    },
  );

  if (portraits.length < 4) {
    portraits.push({
      person: 'show artists',
      situation: `developing a personal ${secondaryStyle || persona || primaryStyle || 'designer-made'} look for a live production`,
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
    return `This ${wholeProduct} is designed for ${buyerContextPhrase(selectedEvents, selectedStyles, selectedPersonas, selectedContext)}, with an original, fashion-led interpretation of ${character} style.`;
  }
  return `This ${wholeProduct} is designed for ${buyerContextPhrase(selectedEvents, selectedStyles, selectedPersonas, selectedContext)}, where its original studio design creates a bold, distinctive look.`;
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

function audiencePerson(value: string) {
  const audience = value.trim();
  if (/^(?:women|woman|female)$/i.test(audience)) return 'women';
  if (/^(?:men|man|male)$/i.test(audience)) return 'men';
  if (/^couple$/i.test(audience)) return 'couples';
  return audience;
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
    if (factCode.includes('material_glossy') || factCode.includes('smooth_glossy')) return 'surface_finish';
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
