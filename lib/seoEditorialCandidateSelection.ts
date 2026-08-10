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
  selected_styles?: unknown;
  body_identity_variant?: unknown;
  product_color?: unknown;
};

const UNSOLD_EXTERNAL_STYLING_PATTERN = /\b(?:hair|hairstyle|makeup|make-up|jewel(?:ry|lery)|accessor(?:y|ies)|footwear|boots?|shoes?|heels?|props?|bodysuits?|base layers?)\b|\b(?:pair|style|wear|combine)\s+(?:it|this|the (?:piece|outfit|costume|look))?\s*with\b/i;
const DURABLE_MODIFIER_PATTERN = /\bdurable\s*,\s*|\bdurable\s+and\s+/i;
const CONCRETE_SHAPE_RETENTION_PATTERN = /\b(?:keeps?|holds?|retain(?:s|ed|ing)?|shape retention)\b[^.!?\n]{0,55}\b(?:shape|form|between wears|next occasion)\b|\bbetween wears\b/i;

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

  const supportedColor = normalizeIdentityColor(context.product_color);
  const primaryWithColor = supportedColor && !containsWholePhrase(primary, supportedColor)
    ? `${toTitleCase(supportedColor)} ${toTitleCase(primary)}`
    : toTitleCase(primary);
  const identity = `${primaryWithColor} for ${formatSelectedEvent(selectedEvent)}`;
  if (identity.length > 68) return output;

  const changed = output.seo_title !== identity || output.h1 !== identity;
  if (!changed) return output;

  return {
    ...output,
    seo_title: identity,
    h1: identity,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      supportedColor
        ? 'Deterministic identity normalization used the reviewed Primary, supported product color and operator-selected event for SEO title and H1.'
        : 'Deterministic identity normalization used the reviewed Primary and operator-selected event for SEO title and H1.',
    ],
  } as T;
}

/**
 * Sentence case is formatting, not creative copy. The API receives lowercase
 * keyword phrases, so a model can preserve that casing at the start of Meta.
 * Capitalize only the first Latin letter and leave every claim untouched.
 */
export function normalizeMetaDescriptionSentenceCase<T>(output: T): T {
  if (!isRecord(output) || typeof output.meta_description !== 'string') return output;
  const metaDescription = output.meta_description
    .trim()
    .replace(/^(\s*["']?)([a-z])/, (_match, prefix: string, letter: string) => (
      `${prefix}${letter.toUpperCase()}`
    ));
  if (!metaDescription || metaDescription === output.meta_description) return output;

  return {
    ...output,
    meta_description: metaDescription,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic Meta normalization repaired sentence-case formatting without changing the claim.',
    ],
  } as T;
}

/**
 * These collections are disabled for the current PDP phase because the fixed
 * right panel and the four left-description blocks already own their jobs.
 * Clearing them deterministically prevents a second generated benefit list,
 * product-level FAQ, or invented links from duplicating otherwise useful copy.
 */
export function normalizeCodeOwnedSeoCollections<T>(output: T): T {
  if (!isRecord(output)) return output;
  const fields = ['bullet_highlights', 'faq', 'internal_linking_hints'] as const;
  const changed = fields.some((field) => (
    !Array.isArray(output[field]) || output[field].length > 0
  ));
  if (!changed) return output;

  return {
    ...output,
    bullet_highlights: [],
    faq: [],
    internal_linking_hints: [],
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic PDP normalization kept duplicate highlights, product FAQ and unapproved internal links empty.',
    ],
  } as T;
}

/**
 * Product-copy generation runs after the operator has selected style, event
 * and persona focus. Free-form pairings with unsold garments or grooming are
 * therefore both out of scope and a leakage risk for customer copy. Delete
 * only those unsafe internal suggestions; ordinary visual observations remain
 * available for ALT and human image review.
 */
export function normalizeUnsafeVisualStyleSuggestions<T>(output: T): T {
  if (!isRecord(output) || !isRecord(output.visual_truth)) return output;
  const suggestions = output.visual_truth.open_style_suggestions;
  if (!Array.isArray(suggestions)) return output;
  const safeSuggestions = suggestions.filter((value) => (
    typeof value !== 'string' || !UNSOLD_EXTERNAL_STYLING_PATTERN.test(value)
  ));
  if (safeSuggestions.length === suggestions.length) return output;

  return {
    ...output,
    visual_truth: {
      ...output.visual_truth,
      open_style_suggestions: safeSuggestions,
    },
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic visual-truth normalization removed unsold external styling suggestions from the product-copy pass.',
    ],
  } as T;
}

/**
 * The 2026-08-10 control response repeated the same durability family in Meta,
 * About and Why. When Why already contains the stronger, concrete shape-
 * retention outcome, remove only the redundant "durable" modifiers from Meta
 * and About. No product claim is added or reworded.
 */
export function normalizeRepeatedDurableModifier<T>(output: T): T {
  if (!isRecord(output) || typeof output.meta_description !== 'string' || !Array.isArray(output.pdp_blocks)) {
    return output;
  }
  const about = output.pdp_blocks.find((block) => (
    isRecord(block) && block.block_key === 'about_this_piece' && typeof block.body === 'string'
  ));
  const why = output.pdp_blocks.find((block) => (
    isRecord(block) && block.block_key === 'why_youll_love_it' && typeof block.body === 'string'
  ));
  if (
    !about
    || !why
    || !DURABLE_MODIFIER_PATTERN.test(output.meta_description)
    || !DURABLE_MODIFIER_PATTERN.test(about.body)
    || !CONCRETE_SHAPE_RETENTION_PATTERN.test(why.body)
  ) return output;

  const metaDescription = output.meta_description.replace(DURABLE_MODIFIER_PATTERN, '');
  const pdpBlocks = output.pdp_blocks.map((block) => (
    block === about ? { ...block, body: about.body.replace(DURABLE_MODIFIER_PATTERN, '') } : block
  ));
  if (metaDescription === output.meta_description && pdpBlocks.every((block, index) => block === output.pdp_blocks[index])) {
    return output;
  }

  return {
    ...output,
    meta_description: metaDescription,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic repetition normalization kept the concrete shape-retention benefit and removed redundant durable modifiers from Meta and About.',
    ],
  } as T;
}

/**
 * Remove a bounded sentence that prescribes unsold styling from the final
 * studio close. If deletion would make an otherwise valid studio paragraph
 * mechanically thin, append one doctrine-owned buyer-value sentence. The
 * fallback is allowed only when the surviving copy already proves first-person
 * studio authorship, original design and direct buyer address.
 */
export function normalizeMainDescriptionExternalStylingAdvice<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'main_description'
      || typeof block.body !== 'string'
      || !UNSOLD_EXTERNAL_STYLING_PATTERN.test(block.body)
    ) return block;

    const sentences = splitEditorialSentences(block.body);
    const retained = sentences.filter((sentence) => !UNSOLD_EXTERNAL_STYLING_PATTERN.test(sentence));
    if (retained.length === sentences.length || retained.length === 0) return block;
    let body = retained.join(' ').trim();
    const hasSafeStudioBasis = (
      /\b(?:TheFEYA|we|our studio)\b/i.test(body)
      && /\b(?:original|design|ideas?|studio)\b/i.test(body)
      && /\b(?:you|your)\b/i.test(body)
    );
    if (
      hasSafeStudioBasis
      && (editorialWordCount(body) < 45 || splitEditorialSentences(body).length < 3)
    ) {
      body = `${body} That gives you room to shape a visual identity that feels personal to you.`;
    }
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic studio-close normalization removed advice about unsold external styling and restored a supported self-expression outcome when required.',
    ],
  } as T;
}

/**
 * One shared zero-cost normalization pipeline is used by both the normal
 * writer route and the explicit repair route. Keeping the order here prevents
 * the two paths from silently diverging as new bounded regressions are added.
 */
export function normalizeSeoEditorialCandidate<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  let normalized = normalizeDeterministicSeoIdentity(output, context);
  normalized = normalizeMetaDescriptionSentenceCase(normalized);
  normalized = normalizeCodeOwnedSeoCollections(normalized);
  normalized = normalizeBodyPrimaryVariation(normalized, context);
  normalized = normalizeRepeatedAboutFinishClause(normalized);
  normalized = normalizeRepeatedDurableModifier(normalized);
  normalized = normalizeMainDescriptionCliches(normalized, context);
  normalized = normalizeMainDescriptionExternalStylingAdvice(normalized);
  normalized = normalizeMainDescriptionSentenceBoundaries(normalized);
  normalized = normalizeUnsafeVisualStyleSuggestions(normalized);
  normalized = normalizeImageAltPrimaryVariation(normalized, context);
  normalized = normalizeSingleSuppliedImageAltCandidate(normalized);
  return normalizeCodeOwnedPdpBlockOrder(normalized);
}

/**
 * The current generation route supplies at most one product image. Extra ALT
 * rows cannot be attached to a real image and have repeatedly introduced
 * unsupported visual claims. Keep the first candidate and let normal ALT
 * validation judge its wording; this changes cardinality only, never prose.
 */
export function normalizeSingleSuppliedImageAltCandidate<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.image_alt_candidates)) return output;
  if (output.image_alt_candidates.length <= 1) return output;

  return {
    ...output,
    image_alt_candidates: output.image_alt_candidates.slice(0, 1),
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic image normalization kept one ALT candidate for the single supplied primary image.',
    ],
  } as T;
}

/**
 * The exact Primary belongs to SEO title, H1 and meta. ALT still needs a clear
 * whole-product phrase, but repeating the Primary there creates a fourth exact
 * occurrence and wastes a repair call. Replacing only that exact phrase with
 * the deterministic body identity is safe because both identities come from
 * the same reviewed Primary; pose, setting and visible-product detail remain
 * untouched for normal image-truth validation.
 */
export function normalizeImageAltPrimaryVariation<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output) || !Array.isArray(output.image_alt_candidates)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const variation = normalizeIdentityValue(context.body_identity_variant);
  if (!primary || !variation || primary.toLowerCase() === variation.toLowerCase()) return output;

  const exactPrimary = new RegExp(`\\b${escapeRegExp(primary)}\\b`, 'gi');
  let changed = false;
  const imageAltCandidates = output.image_alt_candidates.map((candidate) => {
    if (!isRecord(candidate) || typeof candidate.alt_text !== 'string') return candidate;
    const altText = candidate.alt_text.replace(exactPrimary, (match) => {
      changed = true;
      if (match === match.toUpperCase()) return variation.toUpperCase();
      if (/^[A-Z]/.test(match)) return `${variation.charAt(0).toUpperCase()}${variation.slice(1)}`;
      return variation;
    });
    return altText === candidate.alt_text ? candidate : { ...candidate, alt_text: altText };
  });
  if (!changed) return output;

  return {
    ...output,
    image_alt_candidates: imageAltCandidates,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic image normalization used the reviewed whole-product variation in ALT instead of repeating the exact Primary.',
    ],
  } as T;
}

/**
 * The exact Primary is owned by SEO title, H1 and meta description. Models can
 * still echo it in Intro or a PDP paragraph even when the prompt explicitly
 * assigns a reviewed whole-product variation to body copy. Replace only those
 * customer-facing body occurrences; technical fields and the three owned SEO
 * fields remain untouched.
 */
export function normalizeBodyPrimaryVariation<T>(
  output: T,
  context: SeoIdentityNormalizationContext,
): T {
  if (!isRecord(output)) return output;
  const primary = normalizeIdentityValue(context.primary_keyword);
  const variation = normalizeIdentityValue(context.body_identity_variant);
  if (!primary || !variation || primary.toLowerCase() === variation.toLowerCase()) return output;

  let changed = false;
  const replacePrimary = (value: unknown) => {
    if (typeof value !== 'string') return value;
    const next = replacePhrasePreservingCase(value, primary, variation);
    if (next !== value) changed = true;
    return next;
  };
  const intro = replacePrimary(output.intro);
  const bulletHighlights = Array.isArray(output.bullet_highlights)
    ? output.bullet_highlights.map(replacePrimary)
    : output.bullet_highlights;
  const faq = Array.isArray(output.faq)
    ? output.faq.map((row) => (
      isRecord(row)
        ? { ...row, question: replacePrimary(row.question), answer: replacePrimary(row.answer) }
        : row
    ))
    : output.faq;
  const pdpBlocks = Array.isArray(output.pdp_blocks)
    ? output.pdp_blocks.map((block) => (
      isRecord(block)
        ? { ...block, heading: replacePrimary(block.heading), body: replacePrimary(block.body) }
        : block
    ))
    : output.pdp_blocks;
  if (!changed) return output;

  return {
    ...output,
    intro,
    bullet_highlights: bulletHighlights,
    faq,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic body normalization used the reviewed whole-product variation instead of repeating the exact Primary outside its owned SEO fields.',
    ],
  } as T;
}

/**
 * A recurring one-pass failure joins two descriptions of the same finish in a
 * single About sentence (for example, “glossy, mirror-like” before and after
 * “and the”). When that exact bounded shape appears, keep the buyer-facing
 * result clause and remove the duplicated material preamble. Other material
 * prose is left unchanged for normal QA.
 */
export function normalizeRepeatedAboutFinishClause<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'about_this_piece'
      || typeof block.body !== 'string'
    ) return block;
    const body = block.body
      .match(/[^.!?]+[.!?]?/g)
      ?.map((rawSentence) => {
        const sentence = rawSentence.trim();
        const repeatedFinish = ['glossy', 'mirror-like', 'mirror like', 'metallic']
          .some((term) => countLiteralPhrase(sentence, term) > 1);
        if (repeatedFinish && /^the material has\b/i.test(sentence)) {
          const parts = sentence.split(/,\s*and\s+the\s+/i);
          if (parts.length === 2 && /\b(?:surface|finish|coating)\b/i.test(parts[1])) {
            changed = true;
            return `The ${parts[1].trimStart()}`;
          }
        }

        // Paid control run 2026-08-09: the model put the same finish in two
        // adjacent sentences and added only a generic first-glance outcome.
        // Preserve that outcome in plain buyer language while removing the
        // second finish claim. Unknown sentence shapes remain blocked by QA.
        if (
          /^the\s+(?:glossy,?\s+mirror[- ]like\s+)?(?:surface|finish|coating)\s+gives?\b/i.test(sentence)
          && /\bpolished metal finish\b/i.test(sentence)
          && /\bfirst glance\b/i.test(sentence)
        ) {
          changed = true;
          return 'The outfit gives you a starting point for an original character while leaving the surrounding styling choices to you.';
        }

        return sentence;
      })
      .join(' ')
      .trim() || block.body;
    return body === block.body ? block : { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic About normalization removed a duplicated finish clause while preserving its buyer-facing visual result.',
    ],
  } as T;
}

/**
 * Repair only the bounded "step into" forms observed in controlled runs.
 * One form can be deleted without changing the remaining claim; the other is
 * changed to the literal dressing action "put it on". Unknown variants remain
 * visible to normal QA instead of being rewritten without semantic context.
 */
export function normalizeMainDescriptionCliches<T>(
  output: T,
  context: SeoIdentityNormalizationContext = {},
): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const focusSentence = buildMainDescriptionFocusSentence(context);
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.placement !== 'left_description'
      || typeof block.body !== 'string'
    ) return block;
    const boundedControlRunClose = buildBoundedControlRunClose(block.body, context);
    let body = boundedControlRunClose || block.body
      .replace(/\bstep into the scene and\s+/gi, '')
      .replace(/\bthe moment you step into it\b/gi, 'when you put it on')
      .replace(
        /\bfinish it your way and make the look your own\b[.!]?/gi,
        'You choose the surrounding styling that completes the final look for the setting you have in mind.',
      );
    if (focusSentence) {
      body = body.replace(
        /[^.!?\n]*\bbody identity\b[^.!?\n]*[.!?]/gi,
        ` ${focusSentence}`,
      ).replace(/\s{2,}/g, ' ').trim();
    }
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic customer-copy normalization repaired bounded sales clichés or internal identity jargon using only operator-selected focus.',
    ],
  } as T;
}

/**
 * Repair punctuation-only defects in the final self-expression paragraph.
 * This does not invent or rewrite claims: it capitalizes a sentence fragment
 * after terminal punctuation and adds missing terminal punctuation.
 */
export function normalizeMainDescriptionSentenceBoundaries<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  let changed = false;
  const pdpBlocks = output.pdp_blocks.map((block) => {
    if (
      !isRecord(block)
      || block.block_key !== 'main_description'
      || typeof block.body !== 'string'
    ) return block;
    let body = block.body
      .trim()
      .replace(/([.!?]\s+)([a-z])/g, (_match, boundary: string, letter: string) => (
        `${boundary}${letter.toUpperCase()}`
      ));
    if (body && !/[.!?]$/.test(body)) body = `${body}.`;
    if (body === block.body) return block;
    changed = true;
    return { ...block, body };
  });
  if (!changed) return output;

  return {
    ...output,
    pdp_blocks: pdpBlocks,
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      'Deterministic PDP punctuation normalization repaired sentence boundaries in the self-expression close.',
    ],
  } as T;
}

const CANONICAL_LEFT_PDP_ORDER = [
  'about_this_piece',
  'why_youll_love_it',
  'ideal_for',
  'main_description',
] as const;

/**
 * Block identity and layout order are storefront contracts, not creative
 * decisions. A model occasionally returns the required self-expression close
 * with the exact heading and body, but labels it as the optional
 * related_collections/review_only block. Recover only that unambiguous metadata
 * error; malformed, duplicate or ambiguous blocks remain untouched so
 * structural QA can still fail them explicitly.
 */
export function normalizeCodeOwnedPdpBlockOrder<T>(output: T): T {
  if (!isRecord(output) || !Array.isArray(output.pdp_blocks)) return output;
  const hasMainDescription = output.pdp_blocks.some((block) => (
    isRecord(block) && block.block_key === 'main_description'
  ));
  const mislabeledSelfExpressionBlocks = hasMainDescription
    ? []
    : output.pdp_blocks.filter((block) => (
      isRecord(block)
      && block.block_key === 'related_collections'
      && block.placement === 'review_only'
      && /^designed for self-expression$/i.test(String(block.heading || '').trim())
      && Boolean(String(block.body || '').trim())
    ));
  const recoveredSelfExpression = mislabeledSelfExpressionBlocks.length === 1;
  const normalizedBlocks = recoveredSelfExpression
    ? output.pdp_blocks.map((block) => (
      block === mislabeledSelfExpressionBlocks[0]
        ? { ...block, block_key: 'main_description', placement: 'left_description' }
        : block
    ))
    : output.pdp_blocks;
  const leftBlocks = normalizedBlocks.filter((block) => (
    isRecord(block) && block.placement === 'left_description'
  ));
  const byKey = new Map(leftBlocks.map((block) => [String(block.block_key || ''), block]));
  const isCompleteUniqueSet = (
    leftBlocks.length === CANONICAL_LEFT_PDP_ORDER.length
    && byKey.size === CANONICAL_LEFT_PDP_ORDER.length
    && CANONICAL_LEFT_PDP_ORDER.every((key) => byKey.has(key))
  );
  if (!isCompleteUniqueSet) return output;

  const orderedLeft = CANONICAL_LEFT_PDP_ORDER.map((key) => byKey.get(key));
  const nonLeft = normalizedBlocks.filter((block) => (
    !isRecord(block) || block.placement !== 'left_description'
  ));
  const alreadyOrdered = leftBlocks.every((block, index) => block === orderedLeft[index]);
  if (alreadyOrdered && !recoveredSelfExpression) return output;

  return {
    ...output,
    pdp_blocks: [...orderedLeft, ...nonLeft],
    generation_notes: [
      ...(Array.isArray(output.generation_notes) ? output.generation_notes : []),
      ...(recoveredSelfExpression ? [
        'Deterministic PDP contract normalization restored the exact Designed for self-expression close to main_description/left_description.',
      ] : []),
      'Deterministic PDP layout normalization restored the canonical left-block order.',
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

function normalizeIdentityColor(value: unknown) {
  const color = normalizeIdentityValue(value);
  if (!color || color.length > 20 || !/^[a-z]+(?:[ -][a-z]+)?$/i.test(color)) return '';
  if (/^(?:unknown|other|multicolor|multi color|not specified)$/i.test(color)) return '';
  return color;
}

function containsWholePhrase(value: string, phrase: string) {
  return new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i').test(value);
}

function toTitleCase(value: string) {
  return value.replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
}

function formatSelectedEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival$/i.test(value)) return 'Festivals';
  return toTitleCase(value);
}

function buildMainDescriptionFocusSentence(context: SeoIdentityNormalizationContext) {
  const styles = normalizeIdentityValues(context.selected_styles)
    .slice(0, 2)
    .map((value) => value.toLowerCase());
  const events = normalizeIdentityValues(context.selected_events)
    .slice(0, 2)
    .map(formatBodyEvent);
  const stylePhrase = humanJoin(styles, 'or');
  const eventPhrase = humanJoin(events, 'and');
  if (stylePhrase && eventPhrase) return `It can lean ${stylePhrase} for ${eventPhrase}.`;
  if (stylePhrase) return `It can lean ${stylePhrase}.`;
  if (eventPhrase) return `It is designed for ${eventPhrase}.`;
  return '';
}

function buildBoundedControlRunClose(
  body: string,
  context: SeoIdentityNormalizationContext,
) {
  const isExactKnownFailure = (
    /^At TheFEYA, we develop festival and stage pieces from our own ideas,/i.test(body.trim())
    && /\bbody identity\b/i.test(body)
    && /\bfinish it your way and make the look your own\b/i.test(body)
  );
  if (!isExactKnownFailure) return '';

  const identity = normalizeIdentityValue(context.body_identity_variant);
  const color = normalizeIdentityColor(context.product_color).toLowerCase();
  const stylePhrase = humanJoin(
    normalizeIdentityValues(context.selected_styles).slice(0, 2).map((value) => value.toLowerCase()),
    'or',
  );
  const eventPhrase = humanJoin(
    normalizeIdentityValues(context.selected_events).slice(0, 2).map(formatCloseEvent),
    'or',
  );
  if (!identity || !color || !stylePhrase || !eventPhrase) return '';

  return `At TheFEYA, we develop original festival and stage pieces in our studio. We designed this ${identity} as a starting point for a ${stylePhrase} character, pairing a clear ${color} direction with room for your own styling choices. You decide how to complete the character and make its visual identity your own for the ${eventPhrase} setting you have in mind.`;
}

function formatCloseEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival(s)?$/i.test(value)) return 'festival';
  if (/^stage$/i.test(value)) return 'stage';
  return value.toLowerCase();
}

function formatBodyEvent(value: string) {
  if (/^burning man$/i.test(value)) return 'Burning Man';
  if (/^festival$/i.test(value)) return 'festivals';
  if (/^stage$/i.test(value)) return 'the stage';
  return value.toLowerCase();
}

function humanJoin(values: string[], conjunction: 'and' | 'or') {
  const clean = unique(values.filter(Boolean));
  if (clean.length <= 1) return clean[0] || '';
  if (clean.length === 2) return `${clean[0]} ${conjunction} ${clean[1]}`;
  return `${clean.slice(0, -1).join(', ')}, ${conjunction} ${clean.at(-1)}`;
}

function splitEditorialSentences(value: string) {
  return (value.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function editorialWordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replacePhrasePreservingCase(value: string, phrase: string, replacement: string) {
  const exactPhrase = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi');
  return value.replace(exactPhrase, (match) => {
    if (match === match.toUpperCase()) return replacement.toUpperCase();
    if (/^[A-Z]/.test(match)) return `${replacement.charAt(0).toUpperCase()}${replacement.slice(1)}`;
    return replacement;
  });
}

function countLiteralPhrase(value: string, phrase: string) {
  return [...value.matchAll(new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'gi'))].length;
}

function isRecord(value: unknown): value is Record<string, any> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
