// @ts-nocheck

const SILVER_HARNESS_SET_ID = 'ce899f23-b983-4ede-ae81-3348757b1c15';

const SILVER_HARNESS_SET_OPTIONS = {
  '7c29ac2a-8276-4ebd-a374-ffcf5fe31355': {
    public_label: 'Bracelet',
    component_code: 'arms',
    component_family: 'Arms',
  },
  '7f9f2f1d-2a1b-4a48-b155-ff782b02f8e8': {
    public_label: 'Garters',
    component_code: 'legs',
    component_family: 'Legs',
  },
  'ed3b7548-e8b4-4342-8dbe-5093d70a9cfc': {
    public_label: 'Top Harness',
    component_code: 'harness',
    component_family: 'Harness',
  },
  '9ecc5baf-5028-407e-923c-cf216033364d': {
    public_label: 'Shoulders',
    component_code: 'shoulders',
    component_family: 'Shoulders',
  },
};

const SILVER_HARNESS_FULL_SET_ORDER = [
  { code: 'shoulders', label: 'Shoulders' },
  { code: 'harness', label: 'Top Harness' },
  { code: 'arms', label: 'Bracelet' },
  { code: 'legs', label: 'Garters' },
];

function numeric(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function configurationId(row: Record<string, any>) {
  return String(row.configuration_id || row.configuration_price_id || '').trim();
}

/**
 * The recovered price feed for Etsy 1842725537 translated `Top Harness` to
 * `Верхняя обвязка`. Storefront v4 cannot classify that phrase and exposes an
 * anonymous `Option`, even though the original Etsy variation and description
 * both prove the exact component. Keep the raw evidence untouched and apply a
 * narrow, auditable correction to the current selector only.
 */
export function applyOwnerReviewedStorefrontCorrections<T extends Record<string, any>>(product: T): T {
  if (String(product?.canonical_product_id || '') !== SILVER_HARNESS_SET_ID) return product;
  if (!Array.isArray(product.configurations)) return product;

  let changed = false;
  let configurations = product.configurations.map((row: Record<string, any>) => {
    const correction = SILVER_HARNESS_SET_OPTIONS[configurationId(row)];
    if (!correction) return row;
    changed = true;
    return {
      ...row,
      ...correction,
      needs_label_review: false,
    };
  });
  if (!changed) return product;

  const atomicRows = configurations.filter((row: Record<string, any>) => (
    row.is_full_set !== true
    && row.is_bundle !== true
    && String(row.component_code || '').trim()
  ));
  const atomicCodes = new Set(atomicRows.map((row: Record<string, any>) => String(row.component_code)));
  const fullSetMembers = SILVER_HARNESS_FULL_SET_ORDER.filter((member) => atomicCodes.has(member.code));
  const memberCodes = fullSetMembers.map((member) => member.code);
  const memberLabels = fullSetMembers.map((member) => member.label);
  configurations = configurations.map((row: Record<string, any>) => {
    if (row.is_full_set !== true) return row;
    return {
      ...row,
      bundle_component_codes: memberCodes,
      bundle_component_labels: memberLabels,
    };
  });

  const minimumByCode = new Map<string, number>();
  atomicRows.forEach((row: Record<string, any>) => {
    const code = String(row.component_code);
    const price = numeric(row.display_price_amount)
      ?? numeric(row.base_price_amount)
      ?? numeric(row.public_price_amount);
    if (price == null) return;
    const current = minimumByCode.get(code);
    if (current == null || price < current) minimumByCode.set(code, price);
  });
  const componentSum = [...minimumByCode.values()].reduce((sum, price) => sum + price, 0);
  const fullSetRow = configurations.find((row: Record<string, any>) => row.is_full_set === true);
  const fullSetPrice = numeric(fullSetRow?.display_price_amount)
    ?? numeric(fullSetRow?.base_price_amount)
    ?? numeric(fullSetRow?.public_price_amount);
  const savings = fullSetPrice != null && componentSum > fullSetPrice
    ? componentSum - fullSetPrice
    : null;

  return {
    ...product,
    configurations,
    needs_label_review: configurations.some((row: Record<string, any>) => row.needs_label_review === true),
    component_sum_display_price_amount: componentSum || product.component_sum_display_price_amount,
    full_set_savings_amount: savings,
    full_set_savings_percent: savings != null && componentSum > 0
      ? Math.round((savings / componentSum) * 10000) / 100
      : null,
  };
}
