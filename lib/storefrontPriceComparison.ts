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
    const coverage = normalizeCodes(candidate?.memberCodes)
      .filter((code) => targetSet.has(code));
    if (!coverage.length) continue;

    const snapshot = [...states.entries()];
    const next = new Map(states);

    for (const [key, total] of snapshot) {
      const covered = key ? key.split('|') : [];
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
