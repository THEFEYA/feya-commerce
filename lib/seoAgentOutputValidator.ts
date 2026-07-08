import type { SeoAgentOutputContract, SeoQaContract } from '@/lib/seoPackContract';

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
const REQUIRED_ARRAY_FIELDS = ['bullet_highlights', 'faq', 'image_alt_candidates', 'internal_linking_hints', 'generation_notes'] as const;
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

  if (!isRecord(value.qa_self_report)) {
    issues.push(blocker('missing_qa_self_report', 'qa_self_report must be present.'));
  } else {
    REQUIRED_QA_KEYS.forEach((key) => {
      if (!(key in value.qa_self_report)) {
        issues.push(blocker(`missing_qa_${String(key)}`, `qa_self_report.${String(key)} is required.`));
      }
    });
    Object.entries(value.qa_self_report).forEach(([key, qaValue]) => {
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

  if (Array.isArray(value.image_alt_candidates)) {
    value.image_alt_candidates.forEach((candidate, index) => {
      if (!isRecord(candidate)) {
        issues.push(blocker(`invalid_image_alt_${index}`, 'Each image_alt_candidate must be an object.'));
        return;
      }
      if (candidate.truth_basis !== 'visible_product_fact' && candidate.truth_basis !== 'needs_image_review') {
        issues.push(blocker(`invalid_image_truth_${index}`, 'Image ALT truth_basis must be visible_product_fact or needs_image_review.'));
      }
    });
  }

  const hasBlocker = issues.some((issue) => issue.severity === 'blocker');
  return {
    ok: !hasBlocker,
    status: hasBlocker ? 'blocked' : issues.length ? 'warning' : 'valid',
    issues,
  };
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
