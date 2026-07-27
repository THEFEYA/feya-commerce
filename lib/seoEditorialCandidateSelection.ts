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
 * Brand padding in a generated SEO title is a deterministic formatting defect,
 * not a reason to spend another model call or discard otherwise useful copy.
 * Keep the untouched model response in the OpenAI audit trail, while the
 * review candidate uses the same product title without a leading/trailing
 * TheFEYA separator.
 */
export function normalizeFinalSeoEditorialOutput<T>(output: T): T {
  if (!output || typeof output !== 'object' || Array.isArray(output)) return output;
  const record = output as Record<string, unknown>;
  if (typeof record.seo_title !== 'string' || !/\bTheFEYA\b/i.test(record.seo_title)) return output;

  const seoTitle = record.seo_title
    .replace(/^\s*TheFEYA\s*(?:[|·–—-]\s*)?/i, '')
    .replace(/\s*(?:[|·–—-]\s*)?TheFEYA\s*$/i, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
  if (!seoTitle || seoTitle === record.seo_title) return output;

  return {
    ...record,
    seo_title: seoTitle,
    generation_notes: [
      ...(Array.isArray(record.generation_notes) ? record.generation_notes : []),
      'Deterministic review normalization removed brand padding from the SEO title.',
    ],
  } as T;
}

/**
 * A bounded residual pass is allowed to repair only the fields named by the
 * remaining deterministic issue codes. The model must still return the full
 * schema, but unrelated accepted copy is kept byte-for-byte so a small repair
 * cannot regress the title, focus, ALT, or another left-description block.
 */
export function mergeBoundedSeoEditorialRepair<T>(
  baseline: T,
  candidate: T,
  ...validations: ValidationResult[]
): T {
  if (!isRecord(baseline) || !isRecord(candidate)) return baseline;

  const issueCodes = validations
    .flatMap((validation) => validation?.issues || [])
    .map((issue) => String(issue.code || '').trim().toLowerCase())
    .filter(Boolean);
  if (!issueCodes.length) return baseline;

  const topLevelFields = new Set<string>();
  const blockKeys = new Set<string>();
  issueCodes.forEach((code) => {
    const isWholeCopyEditorialIssue = (
      code.startsWith('customer_copy_')
      || code.startsWith('repeated_idea_')
      || code.startsWith('cross_block_')
    );
    if (isWholeCopyEditorialIssue) {
      topLevelFields.add('meta_description');
      topLevelFields.add('intro');
      blockKeys.add('about_this_piece');
      blockKeys.add('why_youll_love_it');
      blockKeys.add('ideal_for');
      blockKeys.add('main_description');
    }
    if (code === 'secondary_keyword_cluster_unrepresented') {
      topLevelFields.add('image_alt_candidates');
    }
    if (code.includes('seo_title')) topLevelFields.add('seo_title');
    if (/(?:^|_)h1(?:_|$)/.test(code)) topLevelFields.add('h1');
    if (code.includes('meta_description')) topLevelFields.add('meta_description');
    if (/(?:^|_)intro(?:_|$)/.test(code)) topLevelFields.add('intro');
    if (code.includes('image_alt') || /(?:^|_)alt(?:_|$)/.test(code)) {
      topLevelFields.add('image_alt_candidates');
    }
    if (code.includes('internal_link')) topLevelFields.add('internal_linking_hints');

    if (code.includes('about_this_piece')) blockKeys.add('about_this_piece');
    if (code.includes('why_youll_love_it') || code.includes('benefit_')) {
      blockKeys.add('why_youll_love_it');
    }
    if (code.includes('ideal_for')) blockKeys.add('ideal_for');
    if (
      code.includes('main_description')
      || code.includes('self_expression')
      || code.includes('pdp_block_self_expression')
    ) {
      blockKeys.add('main_description');
    }
  });

  const merged: Record<string, unknown> = { ...baseline };
  topLevelFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(candidate, field)) {
      merged[field] = candidate[field];
    }
  });

  if (blockKeys.size && Array.isArray(baseline.pdp_blocks) && Array.isArray(candidate.pdp_blocks)) {
    const candidateBlocks = new Map(
      candidate.pdp_blocks
        .filter(isRecord)
        .map((block) => [String(block.block_key || ''), block]),
    );
    merged.pdp_blocks = baseline.pdp_blocks.map((block) => {
      if (!isRecord(block)) return block;
      const key = String(block.block_key || '');
      return blockKeys.has(key) && candidateBlocks.has(key)
        ? candidateBlocks.get(key)
        : block;
    });
  }

  return merged as T;
}

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
  return /(?:unsupported|mismatch|forbidden|product_truth|component|composition|sellable|static_right|price|image_alt|unselected_event|wrong_contract|invalid_|missing_pdp_block|not_object|primary_|keyword_|commercial_language|secondary_keyword_stack)/.test(key);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
