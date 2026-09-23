type FullSetPriceComparisonInput = {
  fullSetPrice: unknown;
  storedComponentSum: unknown;
  storedSavings: unknown;
  fallbackSeparateTotal: unknown;
  exactSeparateTotal?: unknown;
};

type SeparatePurchaseCandidate = {
  price: unknown;
  memberCodes: unknown;
};

export type FullSetPriceComparison = {
  separateRegularTotal: number;
  fullSetSavings: number;
  displayedFullSetSavings: number;
};

/**
 * Keep the displayed comparison total and saving mathematically consistent.
 * V4 already owns the sum of separately purchasable choices, including any
 * grouped choice required to cover the Full Set. Summing every non-Full-Set
 * selector row can count an aggregate (for example Top + Skirt) on top of its
 * atomic Top and Skirt rows.
 */
export function resolveFullSetPriceComparison({
  fullSetPrice,
  storedComponentSum,
  storedSavings,
  fallbackSeparateTotal,
  exactSeparateTotal,
}: FullSetPriceComparisonInput): FullSetPriceComparison {
  const full = finiteAmount(fullSetPrice);
  const componentSum = finiteAmount(storedComponentSum);
  const savings = finiteAmount(storedSavings);
  const fallback = finiteAmount(fallbackSeparateTotal) || 0;
  const exact = finiteAmount(exactSeparateTotal);
  const separateRegularTotal = exact
    ?? componentSum
    ?? (full != null && savings != null ? roundCurrency(full + savings) : fallback);
  const fullSetSavings = full != null && separateRegularTotal > full
    ? roundCurrency(separateRegularTotal - full)
    : 0;
  // Storefront prices are intentionally rendered without cents. Derive the
  // customer-facing saving from those same rendered amounts so a comparison
  // such as €239 vs €295 never claims a visibly inconsistent €55 saving.
  const displayedFullSetSavings = full != null && separateRegularTotal > full
    ? Math.max(0, Math.round(separateRegularTotal) - Math.round(full))
    : 0;

  return { separateRegularTotal, fullSetSavings, displayedFullSetSavings };
}

function finiteAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}


/**
 * Finds the cheapest combination of current non-Full-Set selector choices
 * that covers every component in the current Full Set.
 *
 * This is intentionally a set-cover calculation rather than a sum of all
 * selector rows: a grouped option such as "Top + Shoulders" must not be
 * counted on top of separate Top/Shoulders choices when both exist.
 */
export function resolveMinimumSeparatePurchaseTotal({
  targetMemberCodes,
  candidates,
}: {
  targetMemberCodes: unknown;
  candidates: SeparatePurchaseCandidate[];
}): number | null {
  const target = normalizeCodes(targetMemberCodes);
  if (!target.length) return null;
  const targetSet = new Set(target);
  const fullKey = target.join('|');

  let states = new Map<string, number>([['', 0]]);

  for (const candidate of candidates || []) {
    const price = finiteAmount(candidate?.price);
    if (price == null || price <= 0) continue;
    const coverage = normalizeCodes(candidate?.memberCodes);
    // Savings must compare the same contents, with no extra or duplicate pieces.
    if (!coverage.length || coverage.some(code => !targetSet.has(code))) continue;

    const snapshot = [...states.entries()];
    const next = new Map(states);

    for (const [key, total] of snapshot) {
      const covered = key ? key.split('|') : [];
      if (coverage.some(code => covered.includes(code))) continue;
      const nextKey = [...new Set([...covered, ...coverage])].sort().join('|');
      const nextTotal = roundCurrency(total + price);
      const current = next.get(nextKey);
      if (current == null || nextTotal < current) next.set(nextKey, nextTotal);
    }

    states = next;
  }

  const total = states.get(fullKey);
  return total == null ? null : roundCurrency(total);
}

function normalizeCodes(value: unknown) {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => String(item || '').trim().toLowerCase())
    .filter(Boolean))]
    .sort();
}


export type FullSetPriceAudit = {
  status: 'ok' | 'review';
  discountPercent: number | null;
  reasons: string[];
};

/**
 * Internal review guardrail for bundle prices.
 * It does not set prices. It only flags combinations that deserve owner review.
 *
 * Legacy product-branch heuristic, retained without activating it in the PDP.
 * Its thresholds need a cited current owner policy before operational use:
 * - one shared order avoids repeating roughly €30 of delivery/overhead per extra
 *   separately priced choice;
 * - a deeper promotional discount (often around 20–25%) can be intentional;
 * - prices deeper than that remain allowed but should be reviewed explicitly.
 */
export function resolveFullSetPriceAudit({
  fullSetPrice,
  separateRegularTotal,
  maxSingleOptionPrice,
  separateChoiceCount,
  sharedOverheadPerExtraChoice = 30,
}: {
  fullSetPrice: unknown;
  separateRegularTotal: unknown;
  maxSingleOptionPrice: unknown;
  separateChoiceCount?: unknown;
  sharedOverheadPerExtraChoice?: unknown;
}): FullSetPriceAudit {
  const full = finiteAmount(fullSetPrice);
  const separate = finiteAmount(separateRegularTotal);
  const maxSingle = finiteAmount(maxSingleOptionPrice);
  const choiceCount = Math.max(1, Math.floor(Number(separateChoiceCount) || 1));
  const sharedOverhead = finiteAmount(sharedOverheadPerExtraChoice) ?? 30;
  if (full == null || separate == null || separate <= 0) {
    return { status: 'review', discountPercent: null, reasons: ['price_comparison_incomplete'] };
  }

  // Legacy heuristic assumes shared overhead per additional choice. This
  // compatibility calculation is not evidence of actual costs or price authority.
  // Promotional bundle discount is therefore reviewed against the normalized
  // shared-overhead baseline, while buyer-visible savings still compare against
  // the actual sum of separate selector prices.
  const normalizedBaseline = Math.max(
    maxSingle || 0,
    roundCurrency(separate - sharedOverhead * Math.max(0, choiceCount - 1)),
  );
  const discountPercent = normalizedBaseline > 0
    ? Math.round((1 - full / normalizedBaseline) * 1000) / 10
    : null;
  const reasons: string[] = [];

  if (full >= separate) reasons.push('full_set_not_cheaper_than_separate_choices');
  if (maxSingle != null && full <= maxSingle * 1.1) {
    reasons.push('full_set_too_close_to_single_option');
  }
  if (discountPercent != null && discountPercent > 25) {
    reasons.push('bundle_discount_over_25_percent_review');
  }
  if (discountPercent != null && discountPercent < 0 && full >= separate) {
    reasons.push('negative_bundle_discount');
  }

  return {
    status: reasons.length ? 'review' : 'ok',
    discountPercent,
    reasons,
  };
}
