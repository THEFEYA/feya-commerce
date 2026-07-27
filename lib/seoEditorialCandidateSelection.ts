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

type SeoIdentityNormalizationContext = {
  primary_keyword?: unknown;
  selected_events?: unknown;
};

/**
 * The final editor needs the first pass for schema shape and internal evidence,
 * not as a prose template. Passing rejected customer copy at the end of a long
 * prompt makes even a strong model echo the very phrases QA asked it to remove.
 * Preserve visual truth, link hints, source-basis flags and block structure,
 * while clearing every buyer-facing field before the clean-sheet rewrite.
 */
export function buildSeoEditorialRewriteSkeleton<T>(output: T): T {
  if (!isRecord(output)) return output;

  const pdpBlocks = Array.isArray(output.pdp_blocks)
    ? output.pdp_blocks.map((block) => {
      if (!isRecord(block)) return block;
      return block.placement === 'left_description'
        ? { ...block, body: '' }
        : block;
    })
    : output.pdp_blocks;
  const imageAltCandidates = Array.isArray(output.image_alt_candidates)
    ? output.image_alt_candidates.map((candidate) => (
      isRecord(candidate) ? { ...candidate, alt_text: '' } : candidate
    ))
    : output.image_alt_candidates;
  const qaSelfReport = isRecord(output.qa_self_report)
    ? Object.fromEntries(
      Object.keys(output.qa_self_report).map((key) => [
        key,
        key === 'notes' ? [] : 'not_checked',
      ]),
    )
    : output.qa_self_report;

  return {
    ...output,
    status: 'needs_review',
    seo_title: '',
    h1: '',
    meta_description: '',
    intro: '',
    bullet_highlights: [],
    faq: [],
    image_alt_candidates: imageAltCandidates,
    pdp_blocks: pdpBlocks,
    qa_self_report: qaSelfReport,
    generation_notes: [],
  } as T;
}

/**
 * The reviewed Primary and operator-selected occasion already determine the
 * product-page identity. Keeping those two short fields deterministic prevents
 * a prose editor from replacing the approved search intent with component
 * inventory or a legacy-title phrase. The untouched model response remains
 * represented by the generation audit; this normalization is recorded in the
 * output notes and applies only when the complete identity fits both caps.
 */
export function normalizeDeterministicSeoIdentity<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const selectedEvents = normalizeIdentityValues(context.selected_events);
  const selectedEvent = selectedEvents.find((value) => /^burning man$/i.test(value))
    || selectedEvents[0]
    || '';
  if (!primary || !selectedEvent) return output;

  const identity = `${toTitleCase(primary)} for ${formatSelectedEvent(selectedEvent)}`;
  if (identity.length > 68) return output;

  const changed = output.seo_title !== identity || output.h1 !== identity;
  if (!changed) return output;

  return {
    ...output,
    seo_title: identity,
    h1: identity,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic identity normalization used the reviewed Primary and operator-selected event for SEO title and H1.',
    ],
  } as T;
}

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

/**
 * The production path uses one fast writer and one strong final editor. When
 * both candidates are deterministic-QA clean, prefer the strong editor if it
 * did not add warnings. When the writer is blocked, the normal strict-
 * improvement rule still allows the best inspectable failure to be returned.
 */
export function shouldSelectFinalSeoEditorialCandidate(
  candidate: ValidationResult[],
  baseline: ValidationResult[],
) {
  if (isStrictlyBetterSeoEditorialCandidate(candidate, baseline)) return true;
  const next = seoEditorialIssueSnapshot(...candidate);
  const before = seoEditorialIssueSnapshot(...baseline);
  if (next.blocker_count > 0) return false;
  if (before.blocker_count > 0) return true;
  return next.warning_count <= before.warning_count;
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
  return /(?:unsupported|mismatch|forbidden|product_truth|component|composition|sellable|static_right|price|image_alt|unselected_event|wrong_contract|invalid_|missing_pdp_block|not_object|primary_|keyword_|commercial_language|secondary_keyword_stack|too_thin|_thin|sentence_count|benefit_count|use_case_count|left_description)/.test(key);
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function normalizeIdentityValue(value: unknown) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalizeIdentityValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return unique(values.map(normalizeIdentityValue).filter(Boolean));
}

function toTitleCase(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function formatSelectedEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  return toTitleCase(value);
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
