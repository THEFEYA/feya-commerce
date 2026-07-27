type ValidationIssue = {
  code?: unknown;
  severity?: unknown;
  keyword?: unknown;
};

type ValidationResult = {
  ok?: unknown;
  issues?: ValidationIssue[];
} | null | undefined;

export type SeoEditorialIssueSnapshot = {
  blocker_count: number;
  warning_count: number;
  blocker_keys: string[];
  warning_keys: string[];
};

/**
 * A repair pass is useful only when deterministic QA has something concrete
 * to repair. Calling an editor over an already valid draft adds cost and can
 * silently replace good prose with a merely different version.
 */
export function shouldRunSeoEditorialRepair(...validations: ValidationResult[]) {
  return validations.some((validation) => (
    validation?.ok === false || (validation?.issues || []).length > 0
  ));
}

/**
 * Select a repaired draft only when it is strictly better. A net reduction in
 * editorial blockers is useful even when the rewrite exposes a different
 * wording issue, but factual/Product Truth regressions are never an acceptable
 * trade. Equal blocker counts still require the same blocker classes and fewer
 * warnings.
 */
export function isStrictlyBetterSeoEditorialCandidate(
  candidate: ValidationResult[],
  baseline: ValidationResult[],
) {
  const next = seoEditorialIssueSnapshot(...candidate);
  const before = seoEditorialIssueSnapshot(...baseline);
  const baselineBlockers = new Set(before.blocker_keys);
  const hasNewProtectedBlocker = next.blocker_keys
    .filter((key) => !baselineBlockers.has(key))
    .some(isProtectedBlocker);
  if (hasNewProtectedBlocker) return false;
  if (next.blocker_count < before.blocker_count) return true;
  const hasNewBlocker = next.blocker_keys.some((key) => !baselineBlockers.has(key));
  if (hasNewBlocker) return false;
  return next.blocker_count === before.blocker_count
    && next.warning_count < before.warning_count;
}

export function seoEditorialIssueSnapshot(
  ...validations: ValidationResult[]
): SeoEditorialIssueSnapshot {
  const issues = validations.flatMap((validation) => validation?.issues || []);
  const blockerKeys = unique(
    issues
      .filter((issue) => issue.severity === 'blocker')
      .map(issueKey),
  );
  const warningKeys = unique(
    issues
      .filter((issue) => issue.severity !== 'blocker')
      .map(issueKey),
  );
  return {
    blocker_count: issues.filter((issue) => issue.severity === 'blocker').length,
    warning_count: issues.filter((issue) => issue.severity !== 'blocker').length,
    blocker_keys: blockerKeys,
    warning_keys: warningKeys,
  };
}

function issueKey(issue: ValidationIssue) {
  return [
    String(issue.code || 'unknown_issue').trim(),
    String(issue.keyword || '').trim().toLowerCase(),
  ].join(':');
}

function isProtectedBlocker(key: string) {
  return /(?:unsupported|mismatch|forbidden|product_truth|component|composition|sellable|static_right|price|image_alt|unselected_event|wrong_contract|invalid_|missing_pdp_block|not_object)/.test(key);
}

function unique(values: string[]) {
  return [...new Set(values)];
}
