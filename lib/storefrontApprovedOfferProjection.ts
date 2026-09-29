type Row = Record<string, any>;

export type ApprovedOfferSnapshot = {
  draft_id?: string | null;
  source_decision_id?: string | null;
  sellable_offer_signature?: string | null;
  optional_configurations?: Row[] | null;
};

type SignatureRow = {
  id: string;
  code: string;
  family: string;
  label: string;
  aggregate: boolean;
  full_set: boolean;
  members: string[];
};

function configurationId(row: Row) {
  return String(
    row?.configuration_id
    || row?.configuration_price_id
    || row?.source_price_row_id
    || row?.id
    || '',
  ).trim();
}

function cleanText(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function parseSignature(value: unknown): SignatureRow[] {
  const raw = cleanText(value);
  const prefix = 'storefront-sellable-offer-v1:';
  if (!raw.startsWith(prefix)) return [];
  try {
    const parsed = JSON.parse(raw.slice(prefix.length));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row): SignatureRow | null => {
        if (!row || typeof row !== 'object') return null;
        const id = cleanText(row.id);
        const label = cleanText(row.label);
        if (!id || !label) return null;
        return {
          id,
          code: cleanText(row.code),
          family: cleanText(row.family),
          label,
          aggregate: row.aggregate === true,
          full_set: row.full_set === true,
          members: Array.isArray(row.members) ? row.members.map(cleanText).filter(Boolean) : [],
        };
      })
      .filter((row): row is SignatureRow => Boolean(row));
  } catch {
    return [];
  }
}

function optionalRows(value: unknown): Row[] {
  return Array.isArray(value)
    ? value.filter((row) => row && typeof row === 'object') as Row[]
    : [];
}

function familyLabel(value: string) {
  if (!value) return '';
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Owner-review projection of the exact selector state captured with the approved
 * SEO draft. It never invents prices or identifiers:
 * - current configuration rows remain the price/identity authority;
 * - approved draft snapshots only restore public label/order/membership metadata;
 * - projection is all-or-nothing when a signature is present, so stale IDs cannot
 *   partially rewrite a live selector.
 */
export function projectApprovedOfferSnapshot<T extends Row>(
  product: T,
  snapshot: ApprovedOfferSnapshot | null | undefined,
): T {
  if (!snapshot || !Array.isArray(product?.configurations)) return product;

  const signature = parseSignature(snapshot.sellable_offer_signature);
  const optional = optionalRows(snapshot.optional_configurations);
  const optionalById = new Map(optional.map((row) => [configurationId(row), row]).filter(([id]) => Boolean(id)));
  const currentById = new Map(
    product.configurations
      .map((row: Row) => [configurationId(row), row] as const)
      .filter(([id]) => Boolean(id)),
  );

  const projectionRows: Array<SignatureRow & { optional?: Row }> = signature.length
    ? signature.map((row) => ({ ...row, optional: optionalById.get(row.id) }))
    : optional
      .map((row) => {
        const id = configurationId(row);
        const label = cleanText(row.public_label)
          || cleanText(row.configuration_label)
          || cleanText(row.configuration_name);
        if (!id || !label) return null;
        return {
          id,
          code: cleanText(row.component_code),
          family: cleanText(row.component_family),
          label,
          aggregate: row.is_bundle === true || row.is_full_set === true,
          full_set: row.is_full_set === true,
          members: Array.isArray(row.bundle_component_codes)
            ? row.bundle_component_codes.map(cleanText).filter(Boolean)
            : [],
          optional: row,
        };
      })
      .filter((row): row is SignatureRow & { optional?: Row } => Boolean(row));

  if (!projectionRows.length) return product;

  // The approved selector snapshot may be older than the current relational
  // configuration set. In that case do not apply a partial historical selector.
  if (projectionRows.some((row) => !currentById.has(row.id))) return product;

  const labelByCode = new Map(
    projectionRows
      .filter((row) => row.code)
      .map((row) => [row.code, row.label]),
  );

  const projected = projectionRows.map((entry, index) => {
    const current = currentById.get(entry.id)!;
    const option = entry.optional || optionalById.get(entry.id) || {};
    const memberLabels = entry.members
      .map((code) => labelByCode.get(code) || code)
      .filter(Boolean);

    return {
      ...current,
      public_label: entry.label,
      component_code: entry.code || current.component_code || option.component_code || null,
      component_family: familyLabel(entry.family)
        || current.component_family
        || option.component_family
        || null,
      is_bundle: entry.aggregate && !entry.full_set,
      is_full_set: entry.full_set,
      bundle_component_codes: entry.members,
      bundle_component_labels: memberLabels,
      sort_order: Number.isFinite(Number(option.sort_order)) ? Number(option.sort_order) : index + 1,
      needs_label_review: false,
    };
  });

  return {
    ...product,
    configurations: projected,
    pdp_option_count: projected.length,
    has_multiple_pdp_options: projected.length > 1,
    needs_label_review: false,
  };
}
