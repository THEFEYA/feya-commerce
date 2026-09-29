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
  optional?: Row;
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

    const rows: SignatureRow[] = [];
    for (const value of parsed) {
      if (!value || typeof value !== 'object') continue;
      const row = value as Row;
      const id = cleanText(row.id);
      const label = cleanText(row.label);
      if (!id || !label) continue;
      rows.push({
        id,
        code: cleanText(row.code),
        family: cleanText(row.family),
        label,
        aggregate: row.aggregate === true,
        full_set: row.full_set === true,
        members: Array.isArray(row.members) ? row.members.map(cleanText).filter(Boolean) : [],
      });
    }
    return rows;
  } catch {
    return [];
  }
}

function optionalRows(value: unknown): Row[] {
  if (!Array.isArray(value)) return [];
  return value.filter((row) => Boolean(row) && typeof row === 'object') as Row[];
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
 * - projection is all-or-nothing when snapshot IDs no longer match current rows.
 */
export function projectApprovedOfferSnapshot<T extends Row>(
  product: T,
  snapshot: ApprovedOfferSnapshot | null | undefined,
): T {
  if (!snapshot || !Array.isArray(product?.configurations)) return product;

  const signature = parseSignature(snapshot.sellable_offer_signature);
  const optional = optionalRows(snapshot.optional_configurations);

  const optionalById = new Map<string, Row>();
  for (const row of optional) {
    const id = configurationId(row);
    if (id) optionalById.set(id, row);
  }

  const currentById = new Map<string, Row>();
  for (const row of product.configurations as Row[]) {
    const id = configurationId(row);
    if (id) currentById.set(id, row);
  }

  const projectionRows: SignatureRow[] = [];
  if (signature.length) {
    for (const row of signature) {
      projectionRows.push({ ...row, optional: optionalById.get(row.id) });
    }
  } else {
    for (const option of optional) {
      const id = configurationId(option);
      const label = cleanText(option.public_label)
        || cleanText(option.configuration_label)
        || cleanText(option.configuration_name);
      if (!id || !label) continue;
      projectionRows.push({
        id,
        code: cleanText(option.component_code),
        family: cleanText(option.component_family),
        label,
        aggregate: option.is_bundle === true || option.is_full_set === true,
        full_set: option.is_full_set === true,
        members: Array.isArray(option.bundle_component_codes)
          ? option.bundle_component_codes.map(cleanText).filter(Boolean)
          : [],
        optional: option,
      });
    }
  }

  if (!projectionRows.length) return product;

  // Never mix a partial historical selector with a changed current offer.
  for (const row of projectionRows) {
    if (!currentById.has(row.id)) return product;
  }

  const labelByCode = new Map<string, string>();
  for (const row of projectionRows) {
    if (row.code) labelByCode.set(row.code, row.label);
  }

  const projected: Row[] = projectionRows.map((entry, index) => {
    const current = currentById.get(entry.id) as Row;
    const option: Row = entry.optional || optionalById.get(entry.id) || {};
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
