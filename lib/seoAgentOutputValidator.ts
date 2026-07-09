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
const MATERIAL_PATTERN = /\b(vegan|faux|leather|mirror|metallic|glossy|coating|soft|reinforced|doubled|shape retention)\b/i;
const CYRILLIC_PATTERN = /[А-Яа-яЁёІіЇїЄєҐґ]/;

export function validateSeoAgentOutput(value: unknown): SeoAgentOutputValidationResult {
  const issues: SeoAgentOutputValidationIssue[] = [];

  if (!isRecord(value)) {
    return blocked([{ code: 'not_object', message: 'Agent output must be a JSON object.' }]);
  }

  if (value.contract_version !== 'seo_agent_output_v1') {
    issues.push(blocker('wrong_contract_version', 'Agent output contract_version must be seo_agent_output_v1.'));
  }

  if (!['draft', 'needs_review', 'blocked'].includes(String(value.status || ''))) {
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

  validateVisualTruth(value.visual_truth, issues);
  validatePdpBlocks(value.pdp_blocks, issues);
  validateCustomerCopyLanguage(value, issues);
  validateFaqQuality(value.faq, issues);

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

  if (typeof value.seo_title === 'string' && value.seo_title.length > 72) {
    issues.push(warning('seo_title_long', 'seo_title is longer than the preferred review range.'));
  }

  if (typeof value.meta_description === 'string' && value.meta_description.length > 170) {
    issues.push(warning('meta_description_long', 'meta_description is longer than the preferred review range.'));
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

  if (Array.isArray(value.image_alt_candidates)) {
    value.image_alt_candidates.forEach((candidate, index) => {
      if (!isRecord(candidate)) {
        issues.push(blocker(`invalid_image_alt_${index}`, 'Each image_alt_candidate must be an object.'));
        return;
      }
      if (candidate.truth_basis !== 'visible_product_fact' && candidate.truth_basis !== 'needs_image_review') {
        issues.push(blocker(`invalid_image_truth_${index}`, 'Image ALT truth_basis must be visible_product_fact or needs_image_review.'));
      }
      checkEnglishString(candidate.alt_text, `image_alt_candidates.${index}.alt_text`, issues, 'blocker');
    });
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
  };
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

function validatePdpBlocks(value: unknown, issues: SeoAgentOutputValidationIssue[]) {
  if (!Array.isArray(value)) return;
  const requiredBlocks = ['about_this_piece', 'why_youll_love_it', 'ideal_for', 'whats_included', 'material'];
  const keys = new Set<string>();
  let leftDescriptionChars = 0;
  value.forEach((block, index) => {
    if (!isRecord(block)) {
      issues.push(blocker(`invalid_pdp_block_${index}`, 'Each pdp_block must be an object.'));
      return;
    }
    const key = String(block.block_key || '');
    const placement = String(block.placement || '');
    const body = typeof block.body === 'string' ? block.body : '';
    keys.add(key);
    if (placement === 'left_description') leftDescriptionChars += body.length;
    if (!key) issues.push(blocker(`missing_pdp_block_key_${index}`, 'pdp_block.block_key is required.'));
    if (!['left_description', 'right_info_panel', 'faq_lower', 'review_only'].includes(placement)) {
      issues.push(blocker(`invalid_pdp_block_placement_${index}`, 'pdp_block.placement is invalid.'));
    }
    if (placement === 'right_info_panel') {
      issues.push(blocker(`pdp_block_right_panel_generated_${index}`, 'OpenAI must not generate right_info_panel blocks. The right PDP panel is canonical static storefront content.'));
    }
    if (['sizing_fit', 'production_timing', 'shipping_delivery', 'care', 'customization', 'returns_exchanges', 'handmade_variation'].includes(key)) {
      issues.push(blocker(`pdp_block_static_policy_generated_${index}`, `${key} is canonical right-panel policy content and must not be generated per product.`));
    }
    if (typeof block.heading !== 'string' || !block.heading.trim()) issues.push(blocker(`missing_pdp_block_heading_${index}`, 'pdp_block.heading is required.'));
    if (!body.trim()) issues.push(blocker(`missing_pdp_block_body_${index}`, 'pdp_block.body is required.'));
    checkEnglishString(block.heading, `pdp_blocks.${index}.heading`, issues, 'blocker');
    checkEnglishString(body, `pdp_blocks.${index}.body`, issues, 'blocker');
    if (AUDIT_PHRASE_PATTERN.test(body) && placement !== 'review_only') {
      issues.push(warning(`pdp_block_audit_phrase_${index}`, 'Customer-facing PDP block reads like visual audit, not buyer copy.'));
    }
    if (WEAK_AVAILABILITY_PATTERN.test(body) && placement !== 'review_only') {
      issues.push(warning(`pdp_block_weak_availability_${index}`, 'Customer-facing PDP block uses weak availability or manager-confirmation wording instead of clear service wording.'));
    }
    if (key === 'whats_included' && placement !== 'left_description') {
      issues.push(warning(`pdp_block_included_wrong_placement_${index}`, 'whats_included should be part of the left main description, not a separate right-panel FAQ-style block.'));
    }
    if (key === 'material' && !MATERIAL_PATTERN.test(body)) {
      issues.push(warning(`pdp_block_material_thin_${index}`, 'Material block should describe the actual material benefit, not only list a generic material.'));
    }
    if (key === 'material' && /texture|textured|structural texture/i.test(body)) {
      issues.push(warning(`pdp_block_material_texture_claim_${index}`, 'Glossy mirror products should not be described as textured leather unless source data proves it.'));
    }
    if (key === 'materials_care') {
      issues.push(warning(`pdp_block_legacy_materials_care_${index}`, 'Material should be a product-specific left block; care is canonical right-panel content.'));
    }
  });
  requiredBlocks.forEach((blockKey) => {
    if (!keys.has(blockKey)) {
      issues.push(warning(`missing_pdp_${blockKey}`, `pdp_blocks should include ${blockKey}.`));
    }
  });
  if (leftDescriptionChars < 420) {
    issues.push(warning('left_description_too_thin', 'Main left_description PDP copy is too thin; generate a real product description, not only a short intro.'));
  }
}

function validateCustomerCopyLanguage(value: Record<string, unknown>, issues: SeoAgentOutputValidationIssue[]) {
  CUSTOMER_COPY_FIELDS.forEach((field) => {
    checkEnglishString(value[field], field, issues, 'blocker');
    if (typeof value[field] === 'string' && AUDIT_PHRASE_PATTERN.test(value[field])) {
      issues.push(warning(`${field}_audit_phrase`, `${field} reads like an audit note instead of buyer-facing copy.`));
    }
    if (typeof value[field] === 'string' && WEAK_AVAILABILITY_PATTERN.test(value[field])) {
      issues.push(warning(`${field}_weak_availability`, `${field} uses weak availability wording instead of clear service wording.`));
    }
  });
  if (Array.isArray(value.bullet_highlights)) {
    value.bullet_highlights.forEach((item, index) => checkEnglishString(item, `bullet_highlights.${index}`, issues, 'blocker'));
  }
  if (Array.isArray(value.internal_linking_hints)) {
    value.internal_linking_hints.forEach((item, index) => {
      if (!isRecord(item)) return;
      checkEnglishString(item.anchor, `internal_linking_hints.${index}.anchor`, issues, 'blocker');
      checkEnglishString(item.reason, `internal_linking_hints.${index}.reason`, issues, 'blocker');
    });
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
      issues.push(warning(`faq_should_not_be_product_pdp_${index}`, 'Product-specific included/components FAQ should not be generated for the product PDP. Put this into whats_included instead.'));
    }
    if (AUDIT_PHRASE_PATTERN.test(question) || AUDIT_PHRASE_PATTERN.test(answer)) {
      issues.push(warning(`faq_audit_phrase_${index}`, 'FAQ reads like an audit note instead of answering a buyer concern.'));
    }
    if (WEAK_AVAILABILITY_PATTERN.test(answer)) {
      issues.push(warning(`faq_weak_availability_${index}`, 'FAQ answer uses weak availability wording instead of clear service wording.'));
    }
  });
  if (value.length > 0) {
    issues.push(warning('product_faq_not_rendered_by_default', 'Top-level faq is review-only and should not be rendered inside product PDP by default.'));
  }
}

function checkEnglishString(value: unknown, field: string, issues: SeoAgentOutputValidationIssue[], severity: 'warning' | 'blocker') {
  if (typeof value !== 'string' || !value.trim()) return;
  if (CYRILLIC_PATTERN.test(value)) {
    issues.push({ code: `non_english_${safeCode(field)}`, severity, message: `${field} must be English en-US customer-facing copy.` });
  }
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
