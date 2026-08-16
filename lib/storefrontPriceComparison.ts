type FullSetPriceComparisonInput = {
  fullSetPrice: unknown;
  storedComponentSum: unknown;
  storedSavings: unknown;
  fallbackSeparateTotal: unknown;
};

export type FullSetPriceComparison = {
  separateRegularTotal: number;
  fullSetSavings: number;
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
}: FullSetPriceComparisonInput): FullSetPriceComparison {
  const full = finiteAmount(fullSetPrice);
  const componentSum = finiteAmount(storedComponentSum);
  const savings = finiteAmount(storedSavings);
  const fallback = finiteAmount(fallbackSeparateTotal) || 0;
  const separateRegularTotal = componentSum
    ?? (full != null && savings != null ? roundCurrency(full + savings) : fallback);
  const fullSetSavings = full != null && separateRegularTotal > full
    ? roundCurrency(separateRegularTotal - full)
    : 0;

  return { separateRegularTotal, fullSetSavings };
}

function finiteAmount(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? value
    : null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
