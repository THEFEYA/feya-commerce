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
const REQUIRED_LEFT_BLOCK_ORDER = ['about_this_piece', 'whats_included', 'why_youll_love_it', 'ideal_for', 'material'] as const;
const STATIC_RIGHT_PANEL_KEYS = ['sizing_fit', 'production_timing', 'shipping_delivery', 'care', 'customization', 'returns_exchanges', 'handmade_variation', 'materials_care'] as const;
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
const AUDIT_PHRASE_PATTERN = /\b(the image shows|image shows|shown in the image|shown on the image|the listed materials|listed materials|listed as|is listed as|are listed as|the product is listed|the material is listed|the materials are listed|indicated as|specified as|main focus|central element|at the center|material basis)\b/i;
const WEAK_AVAILABILITY_PATTERN = /\b(if available|when available|where available|if possible|when possible|if supported|when supported|if the design supports it|confirm before ordering|clarify before ordering|ask the manager what is included|confirm configuration|clarify the contents)\b/i;
const MATERIAL_PATTERN = /\b(vegan|faux|leather|mirror|metallic|glossy|coating|soft|reinforced|doubled|shape retention|acrylic|silicone|chain|plastic)\b/i;
const CLICHE_PATTERN = /\b(elevate your look|step into|turn heads|make a statement|perfect for any occasion|crafted to perfection|must have|ultimate|best choice|luxury piece|premium quality)\b/i;
const COMMERCIAL_ALT_PATTERN = /\b(buy|order|price|shop|for sale|shipping|delivery|discount|sale|online store)\b/i;
const CYRILLIC_PATTERN = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LONG_DASH_PATTERN = /[—–]/;

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
    validateRequiredCustomerField(value.seo_title, 'seo_title', 45, 68, issues);
    validateRequiredCustomerField(value.h1, 'h1', 45, 82, issues);
    validateRequiredCustomerField(value.meta_description, 'meta_description', 125, 158, issues);
    validateRequiredCustomerField(value.intro, 'intro', 1, 1200, issues);
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
  validateFaqQuality(value.faq, issues);
  validateImageAltCandidates(value.image_alt_candidates, issues);

  const qaSelfReport = value.qa_self_report;
  if (!isRecord(qaSelfReport)) {
    issues.push(blocker('missing_qa_self_report', 'qa_self_report must be present.'));
  } else {
    REQUIRED_QA_KEYS.forEach((key) => {
      if (!(key in qaSelfReport)) {
        issues.push(blocker(`missing_qa_${String(key)}`, `qa_self_report.${String(key)} is required.`));
      }
    });
    Object.entries(qaSelfReport).forEach(([key, qaValue]) => {
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
  min: number,
  max: number,
  issues: SeoAgentOutputValidationIssue[],
) {
  if (typeof value !== 'string' || !value.trim()) {
    issues.push(blocker(`missing_${field}`, `${field} is required for a non-blocked draft.`));
    return;
  }
  const length = value.trim().length;
  if (length < min) issues.push(blocker(`${field}_short`, `${field} must be at least ${min} characters.`));
  if (length > max) issues.push(blocker(`${field}_long`, `${field} must be no more than ${max} characters.`));
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
      issues.push(blocker(`pdp_block_static_policy_generated_${index}`, `${key} is canonical right-panel content and must not be generated per product.`));
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

    if (key === 'whats_included' && placement !== 'left_description') {
      issues.push(blocker(`pdp_block_included_wrong_placement_${index}`, 'whats_included must be part of the left main description.'));
    }
    if (key === 'whats_included' && WEAK_AVAILABILITY_PATTERN.test(body)) {
      issues.push(blocker(`pdp_block_included_uncertain_${index}`, 'whats_included must not ask the buyer to confirm normal contents.'));
    }
    if (key === 'material' && !MATERIAL_PATTERN.test(body)) {
      issues.push(warning(`pdp_block_material_thin_${index}`, 'Material block should describe the actual supported material or finish.'));
    }
    if (key === 'material' && /texture|textured|structural texture/i.test(body)) {
      issues.push(warning(`pdp_block_material_texture_claim_${index}`, 'Glossy mirror products should not be described as textured leather unless source data proves it.'));
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
    } else if (leftDescriptionWords < 220) {
      issues.push(warning('left_description_below_preferred', 'Main left_description is below the preferred 220-word review range.'));
    }
    if (leftDescriptionWords > 420) {
      issues.push(warning('left_description_above_preferred', 'Main left_description is above the preferred 420-word review range.'));
    }
  }
}

function validateCustomerCopy(value: Record<string, unknown>, issues: SeoAgentOutputValidationIssue[]) {
  CUSTOMER_COPY_FIELDS.forEach((field) => {
    checkEnglishString(value[field], field, issues, 'blocker');
    checkCustomerStyle(value[field], field, issues);
  });

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

function checkCustomerStyle(value: unknown, field: string, issues: SeoAgentOutputValidationIssue[]) {
  if (typeof value !== 'string' || !value.trim()) return;
  if (AUDIT_PHRASE_PATTERN.test(value)) {
    issues.push(warning(`${safeCode(field)}_audit_phrase`, `${field} reads like an audit note instead of buyer-facing copy.`));
  }
  if (WEAK_AVAILABILITY_PATTERN.test(value)) {
    issues.push(warning(`${safeCode(field)}_weak_availability`, `${field} uses weak availability wording instead of clear product wording.`));
  }
  if (CLICHE_PATTERN.test(value)) {
    issues.push(warning(`${safeCode(field)}_ai_cliche`, `${field} contains a generic or overused AI sales phrase.`));
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
      issues.push(warning(`faq_should_not_be_product_pdp_${index}`, 'Product-specific included/components FAQ should be moved into whats_included.'));
    }
    if (AUDIT_PHRASE_PATTERN.test(question) || AUDIT_PHRASE_PATTERN.test(answer)) {
      issues.push(warning(`faq_audit_phrase_${index}`, 'FAQ reads like an audit note instead of answering a buyer concern.'));
    }
    if (WEAK_AVAILABILITY_PATTERN.test(answer)) {
      issues.push(warning(`faq_weak_availability_${index}`, 'FAQ answer uses weak availability wording instead of clear service wording.'));
    }
    if (LONG_DASH_PATTERN.test(question) || LONG_DASH_PATTERN.test(answer)) {
      issues.push(blocker(`faq_long_dash_${index}`, 'FAQ customer copy must not use en dash or em dash punctuation.'));
    }
  });
  if (value.length > 0) {
    issues.push(warning('product_faq_not_rendered_by_default', 'Top-level faq is review-only and should not be rendered inside product PDP by default.'));
  }
}

function validateImageAltCandidates(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!Array.isArray(value)) return;
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
      issues.push(blocker(`commercial_image_alt_${index}`, 'Image ALT must not contain buy, order, price, shop, shipping, sale, or delivery language.'));
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
