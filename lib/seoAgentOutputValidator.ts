import type { SeoQaContract } from '@/lib/seoPackContract';

export type SeoAgentOutputValidationIssue = {
  code: string;
  severity: 'warning' | 'blocker';
  message: string;
};

export type SeoAgentOutputValidationResult = {
  ok: boolean;
  status: 'valid' | 'warning' | 'blocked';
  issues: SeoAgentOutputValidationIssue[];
};

const REQUIRED_STRING_OR_NULL_FIELDS = ['seo_title', 'h1', 'meta_description', 'intro'] as const;
const REQUIRED_ARRAY_FIELDS = ['bullet_highlights', 'faq', 'image_alt_candidates', 'internal_linking_hints', 'pdp_blocks', 'generation_notes'] as const;
const REQUIRED_VISUAL_TRUTH_ARRAYS = ['observed_product_facts', 'dna_matches', 'open_style_suggestions', 'uncertain_or_missing_facts', 'forbidden_visual_claims'] as const;
const REQUIRED_LEFT_BLOCK_ORDER = ['about_this_piece', 'why_youll_love_it', 'ideal_for', 'main_description'] as const;
const STATIC_RIGHT_PANEL_KEYS = [
  'whats_included',
  'sizing_fit',
  'production_timing',
  'shipping_delivery',
  'material',
  'care',
  'customization',
  'returns_exchanges',
  'handmade_variation',
  'materials_care',
] as const;
const REQUIRED_QA_KEYS: Array<keyof SeoQaContract> = [
  'cliche_phrase',
  'long_dash',
  'keyword_stuffing',
  'product_specificity',
  'forbidden_mismatch',
  'similarity_cannibalization',
  'image_alt_truth',
  'commercial_placement',
  'validated_metrics',
  'notes',
];

const CUSTOMER_COPY_FIELDS = ['seo_title', 'h1', 'meta_description', 'intro'] as const;
const AUDIT_PHRASE_PATTERN = /\b(the image shows|image shows|shown in the image|shown on the image|the listed materials|listed materials|listed as|is listed as|are listed as|the product is listed|the material is listed|the materials are listed|the product description (?:says|states|lists|mentions|indicates)|the source (?:says|states|lists|mentions|indicates)|product truth|official product data|source data|database fields?|material basis|safe wording|safest wording|final copy should|must be confirmed|should be confirmed|requires? verification|needs? verification|review before publish|before publication|before publish|main focus|central element|at the center)\b/i;
const WEAK_AVAILABILITY_PATTERN = /\b(if available|when available|where available|if possible|when possible|if supported|when supported|if the design supports it|confirm before ordering|clarify before ordering|ask the manager what is included|confirm configuration|clarify the contents)\b/i;
const PSEUDO_BENEFIT_PATTERN = /\b(works? well as a focal piece|works? as a centerpiece|part of a complete look|over minimal clothing|pairs? with simple clothing|easy to build into (?:a|the) (?:look|outfit)|easy to style|creates? a clear accent|without (?:additional|extra) (?:design )?(?:elements|details|pieces|accessories)|adds? an accent without)\b/i;
const GUARANTEED_OUTCOME_PATTERN = /\b(guarantee(?:d|s)?|will get likes?|will receive likes?|will gain followers?|will make you popular|go viral|viral reach|everyone will notice|all eyes will be on you|guaranteed attention|guaranteed reactions?)\b/i;
const CLICHE_PATTERN = /\b(elevate your look|step into|turn heads|make a statement|perfect for any occasion|crafted to perfection|must have|ultimate|best choice|luxury piece|premium quality)\b/i;
const ROBOTIC_OR_TAUTOLOGICAL_PATTERN = /\b(studio[- ]created from an original in[- ]house concept|studio[- ]created design based on an original in[- ]house concept|based on an original concept (?:created|developed) in[- ]house|buyers? looking for (?:a|an|this|the)|body[- ]friendly feel|studio styling|TheFEYA gives us a way|TheFEYA\s+(?:we|our|us)\b|clean armored attitude|desert[- ]ready (?:mood|presence)|contrast and visual depth|firm armored presence|individual feel|shoulder[- ]led|reads? fast|open light|direct choice for buyers?|holds? its presence|visually strong|deliberate high[- ]impact character|more considered than mass[- ]market|wear with confidence|visual noise|clarity (?:and|or) individuality|clarity of (?:the |your )?(?:look|outfit|image|style)|expressive accent|one[- ]and[- ]only (?:shoulder )?line|more (?:considered|thoughtful) (?:look|appearance) than mass[- ]produced|(?:original|distinctive) alternative to (?:a )?(?:standard|generic|mass[- ]produced) costume (?:look|piece|design)|(?:holds?|keeps?|maintains?|preserves?) (?:its |the |their )?(?:shape|form) (?:during|while|in) (?:movement|motion|moving))\b/i;
const DIRECTIONAL_VISUAL_AUDIT_PATTERN = /\b(?:(?:left|right)[- ](?:shoulder|side|arm|leg)|(?:positioned|placed|located|sits?) (?:high|low|on the (?:left|right))|(?:clearly |well )?visible from (?:the )?(?:front|back|side)|seen from (?:the )?(?:front|back|side))\b/i;
const ANATOMICAL_DESIGN_AUDIT_PATTERN = /\b(?:sculptural (?:profile|silhouette|line) of (?:the )?(?:left|right|one)?\s*shoulder|expressive upper[- ]body (?:form|line|profile|silhouette)|upper[- ]body (?:form|line|profile|silhouette|frame)|shoulder[- ]line|shoulder silhouette)\b/i;
const UNNATURAL_EVENT_ATMOSPHERE_PATTERN = /\b(?:desert light|open light|desert[- ]ready|ready for (?:the )?desert)\b/i;
const BRAND_STATUS_DIMINUTION_PATTERN = /\b(?:small|tiny) independent (?:team|studio|company|brand)\b/i;
const TEMPLATE_COMPARISON_PATTERN = /\b(?:(?:standard|generic|mass[- ]produced) costume template|standard template costume|copy of (?:a )?(?:standard|generic) (?:costume )?template)\b/i;
const PRODUCT_COMPONENT_AS_BUYER_GOAL_PATTERN = /\b(?:buyers?|customers?|people) (?:who want|looking for|seeking) (?:to (?:buy|find) )?(?:a|an|this|the)?\s*(?:statement |expressive |gold |futuristic |cyberpunk |warrior )*(?:shoulder (?:piece|armor|armour)|shoulders?|pauldrons?)\b/i;
const REDUNDANT_SHOULDER_ENTITY_PATTERN = /\bshoulders?\s+(?:armor|armour|piece|pieces|pauldron|pauldrons)\b/gi;
const SOCIAL_METRICS_PATTERN = /\b(organic attention|reactions?, saves? (?:and|or) comments?|likes?, followers?|social (?:engagement|metrics?)|viral(?:ity| reach)?)\b/i;
const REDUNDANT_MATERIAL_PATTERN = /\b(?:vegan leather\s+(?:and|or|\/)\s+faux leather|faux leather\s+(?:and|or|\/)\s+vegan leather)\b/i;
const COMMERCIAL_ALT_PATTERN = /\b(buy|order|price|shop|for sale|shipping|delivery|discount|sale|online store)\b/i;
const SELF_EXPRESSION_STUDIO_PATTERN = /\b(TheFEYA|independent (?:team|studio)|team of designers|designers and makers|our studio|studio team|fresh point of view|original in[- ]house ideas?|distinctive visual language|studio style)\b/i;
const SELF_EXPRESSION_FIRST_PERSON_PATTERN = /\b(we|our|us)\b/i;
const SELF_EXPRESSION_THIRD_PERSON_PATTERN = /\b(TheFEYA is|their (?:pieces|products|designs|work|store)|they (?:create|make|help|offer|design)|the brand|the company)\b/i;
const SELF_EXPRESSION_OPERATION_PATTERN = /\b(?:change|changing|adjust|adjusting|adjustment|adjustments|customi[sz]e|customi[sz]ing)\s+(?:the\s+)?(?:color|size|length|fit|coverage|details?)\b|\b(?:color|size|length|fit|coverage)\s+(?:change|changes|adjustment|adjustments|options?)\b/i;
const SELF_EXPRESSION_PRODUCT_DETAIL_PATTERN = /\b(adjustable straps?|comfortable fit|soft against the body|reinforced construction|material construction)\b/i;
const CYRILLIC_PATTERN = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LONG_DASH_PATTERN = /[—–]/;
const BRAND_PATTERN = /\bTheFEYA\b/gi;

export function validateSeoAgentOutput(value: unknown): SeoAgentOutputValidationResult {
  const issues: SeoAgentOutputValidationIssue[] = [];

  if (!isRecord(value)) {
    return blocked([{ code: 'not_object', message: 'Agent output must be a JSON object.' }]);
  }

  if (value.contract_version !== 'seo_agent_output_v1') {
    issues.push(blocker('wrong_contract_version', 'Agent output contract_version must be seo_agent_output_v1.'));
  }

  const outputStatus = String(value.status || '');
  if (!['draft', 'needs_review', 'blocked'].includes(outputStatus)) {
    issues.push(blocker('invalid_status', 'Agent output status must be draft, needs_review, or blocked.'));
  }

  REQUIRED_STRING_OR_NULL_FIELDS.forEach((field) => {
    const fieldValue = value[field];
    if (fieldValue !== null && typeof fieldValue !== 'string') {
      issues.push(blocker(`invalid_${field}`, `${field} must be a string or null.`));
    }
  });

  REQUIRED_ARRAY_FIELDS.forEach((field) => {
    if (!Array.isArray(value[field])) {
      issues.push(blocker(`invalid_${field}`, `${field} must be an array.`));
    }
  });

  if (outputStatus !== 'blocked') {
    validateRequiredCustomerField(value.seo_title, 'seo_title', 68, issues);
    validateRequiredCustomerField(value.h1, 'h1', 82, issues);
    validateRequiredCustomerField(value.meta_description, 'meta_description', 158, issues);
    validateRequiredCustomerField(value.intro, 'intro', 1000, issues);
    advisoryMinimum(value.seo_title, 'seo_title', 30, issues);
    advisoryMinimum(value.meta_description, 'meta_description', 90, issues);
  }

  if (typeof value.intro === 'string' && value.intro.trim()) {
    const sentences = sentenceCount(value.intro);
    if (sentences < 2 || sentences > 4) {
      issues.push(warning('intro_sentence_count', 'intro should contain 2-4 concise sentences.'));
    }
  }

  validateVisualTruth(value.visual_truth, issues);
  validatePdpBlocks(value.pdp_blocks, issues, outputStatus);
  validateCustomerCopy(value, issues);
  validateBrandUse(value, issues);
  validateFaqQuality(value.faq, issues);
  validateImageAltCandidates(value.image_alt_candidates, issues);
  validateQaSelfReport(value.qa_self_report, issues);

  if (typeof value.seo_title === 'string' && /\bedition\b/i.test(value.seo_title)) {
    issues.push(blocker('seo_title_uses_edition', 'seo_title must not use filler word Edition.'));
  }

  if (typeof value.h1 === 'string' && /\bedition\b/i.test(value.h1)) {
    issues.push(blocker('h1_uses_edition', 'h1 must not use filler word Edition.'));
  }

  if (typeof value.seo_title === 'string' && /steampunk/i.test(value.seo_title)) {
    issues.push(warning('steampunk_needs_visual_proof', 'Steampunk in seo_title requires clear visual proof and human review.'));
  }

  if (Array.isArray(value.bullet_highlights) && value.bullet_highlights.length > 6) {
    issues.push(warning('too_many_bullet_highlights', 'bullet_highlights should stay concise and scannable.'));
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
  };
}

function validateRequiredCustomerField(
  value: unknown,
  field: string,
  max: number,
  issues: SeoAgentOutputValidationIssue[],
) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push(blocker(`missing_${field}`, `${field} is required for a non-blocked draft.`));
    return;
  }
  const length = value.trim().length;
  if (length > max) issues.push(blocker(`${field}_long`, `${field} must be no more than ${max} characters.`));
}

function advisoryMinimum(
  value: unknown,
  field: string,
  min: number,
  issues: SeoAgentOutputValidationIssue[],
) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length >= min) return;
  issues.push(warning(
    `${field}_may_be_too_thin`,
    `${field} is unusually short. Review whether it identifies the product clearly, but never pad it with redundant wording merely to reach a character target.`,
  ));
}

function validateVisualTruth(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push(blocker('missing_visual_truth', 'visual_truth must be present.'));
    return;
  }
  REQUIRED_VISUAL_TRUTH_ARRAYS.forEach((field) => {
    if (!Array.isArray(value[field])) {
      issues.push(blocker(`invalid_visual_truth_${field}`, `visual_truth.${field} must be an array.`));
    }
  });
}

function validatePdpBlocks(value: unknown, issues: SeoAgentOutputValidationIssue[], outputStatus: string) {
  if (!Array.isArray(value)) return;

  const records = value.filter(isRecord);
  if (records.length !== value.length) {
    issues.push(blocker('invalid_pdp_block_object', 'Each pdp_block must be an object.'));
  }

  const keys = new Set<string>();
  const leftKeys: string[] = [];
  let leftDescriptionWords = 0;

  records.forEach((block, index) => {
    const key = String(block.block_key || '');
    const placement = String(block.placement || '');
    const body = typeof block.body === 'string' ? block.body : '';
    const heading = typeof block.heading === 'string' ? block.heading : '';

    if (!key) issues.push(blocker(`missing_pdp_block_key_${index}`, 'pdp_block.block_key is required.'));
    if (keys.has(key)) issues.push(blocker(`duplicate_pdp_block_${safeCode(key)}`, `pdp_blocks contains duplicate block_key ${key}.`));
    keys.add(key);

    if (!['left_description', 'review_only'].includes(placement)) {
      issues.push(blocker(`invalid_pdp_block_placement_${index}`, 'Generated pdp_blocks may use only left_description or review_only placement.'));
    }

    if (placement === 'left_description') {
      leftKeys.push(key);
      leftDescriptionWords += wordCount(body);
    }

    if (STATIC_RIGHT_PANEL_KEYS.includes(key as typeof STATIC_RIGHT_PANEL_KEYS[number])) {
      issues.push(blocker(`pdp_block_static_policy_generated_${index}`, `${key} belongs to the immutable storefront right panel and must not be generated, rewritten, or paraphrased per product.`));
    }

    if (!heading.trim()) issues.push(blocker(`missing_pdp_block_heading_${index}`, 'pdp_block.heading is required.'));
    if (!body.trim()) issues.push(blocker(`missing_pdp_block_body_${index}`, 'pdp_block.body is required.'));
    if (typeof block.source_basis !== 'string' || !['product_fact', 'brand_policy', 'visual_truth', 'needs_human_review'].includes(block.source_basis)) {
      issues.push(blocker(`invalid_pdp_source_basis_${index}`, 'pdp_block.source_basis is invalid.'));
    }
    if (typeof block.needs_human_review !== 'boolean') {
      issues.push(blocker(`invalid_pdp_review_flag_${index}`, 'pdp_block.needs_human_review must be boolean.'));
    }

    checkEnglishString(heading, `pdp_blocks.${index}.heading`, issues, 'blocker');
    checkEnglishString(body, `pdp_blocks.${index}.body`, issues, 'blocker');

    if (placement === 'left_description') {
      checkCustomerStyle(body, `pdp_blocks.${index}.body`, issues);
    }

    if (key === 'why_youll_love_it') {
      const benefitLines = splitDisplayLines(body);
      if (benefitLines.length < 2 || benefitLines.length > 4) {
        issues.push(blocker(`pdp_block_benefit_count_${index}`, 'why_youll_love_it must contain 2-4 concise, evidenced purchase reasons. Never invent a third or fourth merely to fill space.'));
      }
    }

    if (key === 'main_description') {
      if (heading.trim().toLowerCase() !== 'designed for self-expression') {
        issues.push(blocker('main_description_wrong_heading', 'main_description heading must be Designed for self-expression.'));
      }
      const selfExpressionWords = wordCount(body);
      const selfExpressionSentences = sentenceCount(body);
      if (selfExpressionWords < 45) {
        issues.push(blocker(`pdp_block_self_expression_thin_${index}`, 'Designed for self-expression must contain 45-75 useful words covering our independent design perspective, original-design purpose, a complete supported look and an honest buyer outcome.'));
      }
      if (selfExpressionWords > 75) {
        issues.push(warning(`pdp_block_self_expression_long_${index}`, 'Designed for self-expression is longer than 75 words. Remove generic biography or repeated facts.'));
      }
      if (selfExpressionSentences < 3 || selfExpressionSentences > 4) {
        issues.push(blocker(`pdp_block_self_expression_sentence_count_${index}`, 'Designed for self-expression must contain 3-4 natural sentences with one clear job each.'));
      }
      if (!SELF_EXPRESSION_STUDIO_PATTERN.test(body)) {
        issues.push(blocker('main_description_missing_studio_identity', 'Designed for self-expression must introduce the studio or design team and its distinctive in-house creative language.'));
      }
      if (!SELF_EXPRESSION_FIRST_PERSON_PATTERN.test(body)) {
        issues.push(blocker('main_description_missing_first_person_voice', 'Designed for self-expression must speak directly as the studio using we, our or us.'));
      }
      if (SELF_EXPRESSION_THIRD_PERSON_PATTERN.test(body)) {
        issues.push(blocker('main_description_uses_third_person_voice', 'Designed for self-expression must not describe TheFEYA as they, their, the brand, the company or a third party.'));
      }
      if (SELF_EXPRESSION_OPERATION_PATTERN.test(body)) {
        issues.push(blocker('main_description_contains_operational_customization', 'Designed for self-expression must not repeat color, size, length, fit, coverage, or detail-change instructions from the fixed right panel.'));
      }
      if (SELF_EXPRESSION_PRODUCT_DETAIL_PATTERN.test(body)) {
        issues.push(blocker('main_description_repeats_fixed_panel_specs', 'Designed for self-expression may use one visible design choice, but must not repeat fit, comfort or construction instructions from the fixed right panel.'));
      }
    }
  });

  if (outputStatus !== 'blocked') {
    const actualOrder = leftKeys.join('|');
    const requiredOrder = REQUIRED_LEFT_BLOCK_ORDER.join('|');
    if (actualOrder !== requiredOrder) {
      issues.push(blocker(
        'pdp_left_block_order',
        `left_description blocks must be exactly: ${REQUIRED_LEFT_BLOCK_ORDER.join(', ')}. Received: ${leftKeys.join(', ') || 'none'}.`,
      ));
    }

    REQUIRED_LEFT_BLOCK_ORDER.forEach((blockKey) => {
      if (!keys.has(blockKey)) {
        issues.push(blocker(`missing_pdp_${blockKey}`, `pdp_blocks must include ${blockKey}.`));
      }
    });

    if (leftDescriptionWords < 120) {
      issues.push(blocker('left_description_too_thin', 'Main left_description PDP copy is too thin for review.'));
    }
    if (leftDescriptionWords > 300) {
      issues.push(warning('left_description_above_preferred', 'Main left_description is longer than the usual 300-word review range. Keep it only when every sentence adds supported product or buyer value.'));
    }
  }
}

function validateCustomerCopy(value: Record<string, unknown>, issues: SeoAgentOutputValidationIssue[]) {
  CUSTOMER_COPY_FIELDS.forEach((field) => {
    checkEnglishString(value[field], field, issues, 'blocker');
    checkCustomerStyle(value[field], field, issues);
  });

  if (typeof value.h1 === 'string') {
    const repeatedShoulderEntities = value.h1.match(REDUNDANT_SHOULDER_ENTITY_PATTERN) || [];
    if (repeatedShoulderEntities.length > 1) {
      issues.push(blocker(
        'h1_restates_same_product_entity',
        'H1 names the shoulder product twice through equivalent terms. Use the product entity once and spend the remaining words on a different verified attribute or use case.',
      ));
    }
  }

  if (Array.isArray(value.bullet_highlights)) {
    value.bullet_highlights.forEach((item, index) => {
      checkEnglishString(item, `bullet_highlights.${index}`, issues, 'blocker');
      checkCustomerStyle(item, `bullet_highlights.${index}`, issues);
    });
  }

  if (Array.isArray(value.internal_linking_hints)) {
    value.internal_linking_hints.forEach((item, index) => {
      if (!isRecord(item)) {
        issues.push(blocker(`invalid_internal_link_${index}`, 'Each internal_linking_hint must be an object.'));
        return;
      }
      checkEnglishString(item.anchor, `internal_linking_hints.${index}.anchor`, issues, 'blocker');
      checkEnglishString(item.reason, `internal_linking_hints.${index}.reason`, issues, 'blocker');
    });
  }
}

function validateBrandUse(value: Record<string, unknown>, issues: SeoAgentOutputValidationIssue[]) {
  ['seo_title', 'h1', 'meta_description'].forEach((field) => {
    const text = typeof value[field] === 'string' ? String(value[field]) : '';
    if (/\bTheFEYA\b/i.test(text)) {
      issues.push(blocker(`${field}_brand_padding`, `${field} must describe the product and must not use TheFEYA as brand-name padding.`));
    }
  });

  const visibleBody: string[] = [];
  if (typeof value.intro === 'string') visibleBody.push(value.intro);
  if (Array.isArray(value.bullet_highlights)) {
    visibleBody.push(...value.bullet_highlights.filter((item): item is string => typeof item === 'string'));
  }
  if (Array.isArray(value.pdp_blocks)) {
    value.pdp_blocks.filter(isRecord).forEach((block) => {
      if (block.placement === 'left_description') {
        if (typeof block.heading === 'string') visibleBody.push(block.heading);
        if (typeof block.body === 'string') visibleBody.push(block.body);
      }
    });
  }

  const mentions = countMatches(visibleBody.join('\n'), BRAND_PATTERN);
  if (mentions > 1) {
    issues.push(blocker('brand_name_overused_in_product_copy', `TheFEYA appears ${mentions} times in generated visible copy. Maximum allowed is one.`));
  }
}

function validateQaSelfReport(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push(blocker('missing_qa_self_report', 'qa_self_report must be present.'));
    return;
  }

  REQUIRED_QA_KEYS.forEach((key) => {
    if (!(key in value)) {
      issues.push(blocker(`missing_qa_${String(key)}`, `qa_self_report.${String(key)} is required.`));
    }
  });

  Object.entries(value).forEach(([key, qaValue]) => {
    if (key === 'notes') {
      if (!Array.isArray(qaValue)) issues.push(blocker('invalid_qa_notes', 'qa_self_report.notes must be an array.'));
      return;
    }
    if (!['pass', 'warning', 'blocker', 'not_checked'].includes(String(qaValue))) {
      issues.push(blocker(`invalid_qa_${key}`, `qa_self_report.${key} has invalid status.`));
    }
    if (qaValue === 'blocker') {
      issues.push(blocker(`qa_blocker_${key}`, `qa_self_report.${key} is blocker.`));
    }
  });
}

function checkCustomerStyle(value: unknown, field: string, issues: SeoAgentOutputValidationIssue[]) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (AUDIT_PHRASE_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_audit_phrase`, `${field} contains internal source, verification, Product Truth, database or pre-publication language.`));
  }
  if (WEAK_AVAILABILITY_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_weak_availability`, `${field} uses internal uncertainty wording instead of final buyer-facing copy.`));
  }
  if (PSEUDO_BENEFIT_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_pseudo_benefit`, `${field} contains weak styling filler or an empty pseudo-benefit.`));
  }
  if (GUARANTEED_OUTCOME_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_guaranteed_outcome`, `${field} guarantees popularity, likes, followers or audience reactions.`));
  }
  if (CLICHE_PATTERN.test(value)) {
    issues.push(warning(`${safeCode(field)}_ai_cliche`, `${field} contains a generic or overused sales phrase.`));
  }
  if (ROBOTIC_OR_TAUTOLOGICAL_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_robotic_or_tautological`, `${field} contains internal-process wording, a tautology, or a vague pseudo-benefit.`));
  }
  if (DIRECTIONAL_VISUAL_AUDIT_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_alt_only_directional_detail`, `${field} contains left/right, viewing-angle or visibility coordinates that belong only in image ALT or internal visual truth.`));
  }
  if (ANATOMICAL_DESIGN_AUDIT_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_anatomical_design_audit`, `${field} turns shoulder or upper-body geometry into customer value instead of explaining a complete event or style look.`));
  }
  if (UNNATURAL_EVENT_ATMOSPHERE_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_unnatural_event_atmosphere`, `${field} forces an event keyword into unnatural atmosphere wording such as desert light or desert-ready.`));
  }
  if (BRAND_STATUS_DIMINUTION_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_brand_status_diminution`, `${field} describes TheFEYA as small or tiny. Team size is not an approved buyer benefit.`));
  }
  if (TEMPLATE_COMPARISON_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_invented_template_comparison`, `${field} compares the design with an undefined standard costume template instead of explaining buyer value.`));
  }
  if (PRODUCT_COMPONENT_AS_BUYER_GOAL_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_product_component_as_buyer_goal`, `${field} treats a product component as the buyer’s final goal instead of the means to create an event, style or performance look.`));
  }
  if (SOCIAL_METRICS_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_social_metrics`, `${field} contains social-performance boilerplate instead of product value.`));
  }
  if (REDUNDANT_MATERIAL_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_redundant_material`, `${field} presents vegan leather and faux leather as separate materials.`));
  }
  if (LONG_DASH_PATTERN.test(value)) {
    issues.push(blocker(`${safeCode(field)}_long_dash`, `${field} contains an en dash or em dash; use normal sentence punctuation.`));
  }
}

function validateFaqQuality(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!Array.isArray(value)) return;
  value.forEach((item, index) => {
    if (!isRecord(item)) {
      issues.push(blocker(`invalid_faq_${index}`, 'Each FAQ item must be an object.'));
      return;
    }
    checkEnglishString(item.question, `faq.${index}.question`, issues, 'blocker');
    checkEnglishString(item.answer, `faq.${index}.answer`, issues, 'blocker');
    const question = String(item.question || '');
    const answer = String(item.answer || '');
    if (/what is included|included in the order|main focus|shown|image|central element/i.test(question)) {
      issues.push(warning(`faq_should_not_be_product_pdp_${index}`, 'Product-specific composition FAQ belongs in the dynamic right PDP panel.'));
    }
    checkCustomerStyle(question, `faq.${index}.question`, issues);
    checkCustomerStyle(answer, `faq.${index}.answer`, issues);
  });
  if (value.length > 0) {
    issues.push(warning('product_faq_not_rendered_by_default', 'Top-level faq is review-only and should not be rendered inside product PDP by default.'));
  }
}

function validateImageAltCandidates(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!Array.isArray(value)) return;
  if (value.length > 1) {
    issues.push(blocker(
      'image_alt_candidates_exceed_supplied_images',
      'Only one primary image is supplied to this generation contract, so only one image-specific ALT candidate may be returned.',
    ));
  }
  const seen = new Set<string>();

  value.forEach((candidate, index) => {
    if (!isRecord(candidate)) {
      issues.push(blocker(`invalid_image_alt_${index}`, 'Each image_alt_candidate must be an object.'));
      return;
    }
    if (candidate.truth_basis !== 'visible_product_fact' && candidate.truth_basis !== 'needs_image_review') {
      issues.push(blocker(`invalid_image_truth_${index}`, 'Image ALT truth_basis must be visible_product_fact or needs_image_review.'));
    }
    if (!['primary', 'detail', 'lifestyle', 'unknown'].includes(String(candidate.image_role || ''))) {
      issues.push(blocker(`invalid_image_role_${index}`, 'Image ALT image_role is invalid.'));
    }

    const alt = typeof candidate.alt_text === 'string' ? candidate.alt_text.trim() : '';
    if (!alt) {
      issues.push(blocker(`missing_image_alt_${index}`, 'Image ALT text must not be empty.'));
      return;
    }
    checkEnglishString(alt, `image_alt_candidates.${index}.alt_text`, issues, 'blocker');
    if (COMMERCIAL_ALT_PATTERN.test(alt)) {
      issues.push(blocker(`commercial_image_alt_${index}`, 'Image ALT must not contain buy, order, price, shop, shipping, sale or delivery language.'));
    }
    if (LONG_DASH_PATTERN.test(alt)) {
      issues.push(blocker(`image_alt_long_dash_${index}`, 'Image ALT must not use en dash or em dash punctuation.'));
    }
    if (alt.length < 8) issues.push(warning(`image_alt_short_${index}`, 'Image ALT is too short to describe a visible product fact.'));
    if (alt.length > 160) issues.push(warning(`image_alt_long_${index}`, 'Image ALT is longer than the preferred 160-character limit.'));

    const key = alt.toLowerCase();
    if (seen.has(key)) issues.push(warning(`duplicate_image_alt_${index}`, 'Image ALT candidates should not repeat identical text.'));
    seen.add(key);
  });
}

function checkEnglishString(value: unknown, field: string, issues: SeoAgentOutputValidationIssue[], severity: 'warning' | 'blocker') {
  if (typeof value !== 'string' || !value.trim()) return;
  if (CYRILLIC_PATTERN.test(value)) {
    issues.push({ code: `non_english_${safeCode(field)}`, severity, message: `${field} must be English en-US customer-facing copy.` });
  }
}

function sentenceCount(value: string) {
  return value.split(/[.!?]+/).map((item) => item.trim()).filter(Boolean).length;
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function splitDisplayLines(value: string) {
  return value
    .split(/\n|•/)
    .map((item) => item.replace(/^[-*]\s*/, '').trim())
    .filter(Boolean);
}

function countMatches(value: string, pattern: RegExp) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  return [...value.matchAll(new RegExp(pattern.source, flags))].length;
}

function blocked(issues: Array<Omit<SeoAgentOutputValidationIssue, 'severity'>>): SeoAgentOutputValidationResult {
  return {
    ok: false,
    status: 'blocked',
    issues: issues.map((issue) => ({ ...issue, severity: 'blocker' })),
  };
}

function blocker(code: string, message: string): SeoAgentOutputValidationIssue {
  return { code, message, severity: 'blocker' };
}

function warning(code: string, message: string): SeoAgentOutputValidationIssue {
  return { code, message, severity: 'warning' };
}

function safeCode(value: string) {
  return value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
