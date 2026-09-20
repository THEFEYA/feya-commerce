export type KeywordPageRange = {
  from: number;
  to: number;
};

export type KeywordPagePlan = {
  requested_rows: number;
  truncated: boolean;
  ranges: KeywordPageRange[];
};

/**
 * Plans inclusive PostgREST ranges for a complete, bounded Keyword Bank read.
 * Supabase projects commonly cap one response page even when a larger `.limit`
 * is requested, so callers must page explicitly instead of trusting one query.
 */
export function planKeywordPageRanges(
  totalRows: number,
  maxRows: number,
  pageSize: number,
): KeywordPagePlan {
  const safeTotal = nonNegativeInteger(totalRows);
  const safeMax = positiveInteger(maxRows, 1);
  const safePageSize = positiveInteger(pageSize, 1);
  const requestedRows = Math.min(safeTotal, safeMax);
  const ranges: KeywordPageRange[] = [];

  for (let from = 0; from < requestedRows; from += safePageSize) {
    ranges.push({
      from,
      to: Math.min(from + safePageSize, requestedRows) - 1,
    });
  }

  return {
    requested_rows: requestedRows,
    truncated: safeTotal > safeMax,
    ranges,
  };
}

function nonNegativeInteger(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function positiveInteger(value: number, fallback: number) {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}
