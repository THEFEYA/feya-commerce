// @ts-nocheck

const SILVER_HARNESS_SET_ID = 'ce899f23-b983-4ede-ae81-3348757b1c15';
const SILVER_MENS_WARRIOR_SET_ID = '4b0c8180-774d-4d5c-a12c-0864f305d1cb';
const COSMIC_TOP_SKIRT_SET_ID = '657bd6d8-fbe1-4441-abad-f574e3380897';
const COSMIC_TOP_OPTION_ID = '2a41b72b-4ce0-468f-b709-824d03b385e9';
const BROWN_HARNESS_ID = 'de38a842-37c4-40a7-86b4-393341c4c9aa';
// Original Primary color price rows, not three different component choices.
const BROWN_HARNESS_COLORS = {
  '4b56be10-1771-4a5c-9daa-6ae70e8650f0': { color: 'Brown', order: 1 },
  'e689d3b4-acc1-4fa2-ad12-4463207fcdd9': { color: 'Black', order: 2 },
  '9a3cd61f-e87f-4590-b39f-b143e75ca0f7': { color: 'Green', order: 3 },
};

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

const SILVER_MENS_WARRIOR_SEPARATE_OPTION_IDS = [
  'bb5ae6b4-824d-45cf-a1ac-8e2a26111242', // Bracelet
  '22aacfc5-7ffa-4a7e-800e-448ba0ec88dc', // Skirt
  'e0b68b79-a4a1-4b9e-a33e-8240777a52bc', // Top + Shoulders
];

const SILVER_MENS_WARRIOR_FULL_SET_ORDER = [
  { code: 'arms', label: 'Bracelet' },
  { code: 'shoulders', label: 'Shoulders' },
  { code: 'skirt', label: 'Skirt' },
  { code: 'top', label: 'Top' },
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
  if (BATCH09_REVIEWED_OPTIONS[String(product?.canonical_product_id || '')]) {
    return correctBatch09SourceOptions(product);
  }
  if (BATCH08_REVIEWED_OPTIONS[String(product?.canonical_product_id || '')]) {
    return correctBatch08SourceOptions(product);
  }
  if (String(product?.canonical_product_id || '') === 'e7c214cd-a825-49c6-9759-12318d1464fe') {
    return correctAngelLimbOptions(product);
  }
  if (String(product?.canonical_product_id || '') === '95d6c9f0-4437-4730-b772-f10f9c82321d') {
    return correctShoulderBeltSet(product);
  }
  if (String(product?.canonical_product_id || '') === '8655f3ce-c4e8-4982-8a75-dce413e26674') {
    return correctCosmicGroupedOptions(product);
  }
  if (String(product?.canonical_product_id || '') === BROWN_HARNESS_ID) {
    return correctBrownHarnessColors(product);
  }
  if (String(product?.canonical_product_id || '') === COSMIC_TOP_SKIRT_SET_ID) {
    return correctCosmicTopSkirtSet(product);
  }
  if (String(product?.canonical_product_id || '') === SILVER_MENS_WARRIOR_SET_ID) {
    return correctSilverMensWarriorSet(product);
  }
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

// Source variation and exact price-row labels agree. These mappings preserve
// the existing options and prices; SEO axes never manufacture sellable parts.
const BATCH08_REVIEWED_OPTIONS = {
  '057fbd51-52f5-4404-b126-e5d75b8599f4': {
    'aefa2c61-c430-4675-9964-9cd1e3f1658e': {
      public_label: "Men's Outfit", component_code: 'mens_outfit', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      // Owner clarified the two distinct arm accessories on 2026-09-17.
      bundle_component_codes: ['choker', 'shoulders', 'biceps', 'bracelet'],
      bundle_component_labels: ['Choker', 'Shoulders', 'Bicep Piece', 'Bracelet'],
    },
    '5074ad3c-af6a-4cf7-9624-ce351ee9cafc': {
      public_label: "Women's Outfit", component_code: 'womens_outfit', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['choker', 'top', 'skirt', 'bracelets'],
      bundle_component_labels: ['Choker', 'Top', 'Skirt', 'Bracelets'],
    },
  },
  '9400d8af-b6b9-4b4a-b878-b97eba761e10': {
    '02d389b4-a3b1-44c6-87bb-e18ba2922851': {
      public_label: 'Choker + Shoulders', component_code: 'choker_shoulders', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['choker', 'shoulders'], bundle_component_labels: ['Choker', 'Shoulders'],
    },
  },
  'd06ab9d9-52c5-4f8c-b583-d9e5316eb69c': {
    'e61675cc-689b-416d-953d-3c8faada89c7': {
      public_label: 'Top', component_code: 'top', component_family: 'Top',
    },
    // The source explicitly includes bracelets in Full Set, but does not
    // sell a separate Bracelet option. Do not add a price row for it.
    'ffff32fe-3d63-489b-9bb4-e47b49b97fbe': {
      bundle_component_codes: ['choker', 'top', 'skirt', 'arms'],
      bundle_component_labels: ['Choker', 'Top', 'Skirt', 'Bracelets'],
      source_confirmed_bundle_members: true,
    },
  },
  '5255562a-0181-4fe3-bf4f-e5083f5638e5': {
    '30d69d12-f7bd-40f9-a63b-1e70d843ef0f': {
      public_label: 'Top', component_code: 'top', component_family: 'Top',
    },
  },
};

function correctBatch08SourceOptions<T extends Record<string, any>>(product: T): T {
  const options = BATCH08_REVIEWED_OPTIONS[String(product.canonical_product_id)];
  if (!Array.isArray(product.configurations)
    || !Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    return correction ? { ...row, ...correction, needs_label_review: false } : row;
  });
  const corrected = { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
  return String(product.canonical_product_id) === '057fbd51-52f5-4404-b126-e5d75b8599f4'
    ? correctOwnerCoupleFullSet(corrected) : corrected;
}

/** Only enrich the real, owner-created database option; never synthesize a SKU. */
function correctOwnerCoupleFullSet<T extends Record<string, any>>(product: T): T {
  const fullId = '26274d0c-81c9-44e6-9ce7-c3056c62040c';
  const full = product.configurations.find(row => configurationId(row) === fullId);
  if (!full) return product;
  const partners = ['5074ad3c-af6a-4cf7-9624-ce351ee9cafc', 'aefa2c61-c430-4675-9964-9cd1e3f1658e']
    .map(id => product.configurations.find(row => configurationId(row) === id));
  if (partners.some(row => !row || row.currency !== full.currency)) return product;
  const total = partners.reduce((sum, row) => sum + Number(row.display_price_amount), 0);
  const price = Number(full.display_price_amount);
  if (!Number.isFinite(total) || !Number.isFinite(price)) return product;
  const members = new Map<string, string>();
  partners.forEach(row => row.bundle_component_codes.forEach((code, i) => members.set(code, row.bundle_component_labels[i])));
  const configurations = product.configurations.map(row => configurationId(row) === fullId ? {
    ...row, public_label: 'Full Set — Both Outfits', component_code: 'full_set', component_family: 'Bundle',
    is_full_set: true, is_bundle: true, needs_label_review: false,
    bundle_component_codes: [...members.keys()], bundle_component_labels: [...members.values()],
    price_source_mode: 'owner_authorized_bundle', price_confidence_status: 'owner_reviewed',
  } : row);
  const savings = Math.max(0, Math.round((total-price)*100)/100);
  return { ...product, configurations, component_sum_display_price_amount: Math.round(total*100)/100,
    full_set_display_price_amount: price, full_set_savings_amount: savings,
    full_set_savings_percent: total > 0 ? Math.round(savings/total*10000)/100 : null };
}

// Exact imported variant names and descriptions agree; preserve price-row identities.
const BATCH09_REVIEWED_OPTIONS = {
  'cb31d61b-027c-4c47-b7ba-bf16283ada9c': {
    '1210a522-aca3-4da9-9542-c297df40f569': { public_label: 'Glove', component_code: 'arms', component_family: 'Arms' },
    '2e1e98bd-5c0a-46f2-b607-4272177bf3ee': { public_label: 'Spine & Tail', component_code: 'spine_tail', component_family: 'Bundle',
      is_bundle: true, bundle_component_codes: ['spine','tail'], bundle_component_labels: ['Spine','Tail'] },
  },
  'e7238b1d-565c-4c4d-a7ae-a4402de80720': {
    '7246011d-b286-495b-9487-d58b9eb4b10b': { public_label: 'Spine & Tail', component_code: 'spine_tail', component_family: 'Bundle',
      is_bundle: true, bundle_component_codes: ['spine','tail'], bundle_component_labels: ['Spine','Tail'] },
  },
  'b3910e41-9de7-483f-8d88-5783e8d90607': {
    '304d98e5-399f-4bf1-84df-da1af1a9cd0f': { public_label: 'Top Bra', component_code: 'top', component_family: 'Top' },
  },
};

function correctBatch09SourceOptions<T extends Record<string, any>>(product: T): T {
  const mapping = BATCH09_REVIEWED_OPTIONS[String(product.canonical_product_id)];
  if (!Array.isArray(product.configurations)
    || !Object.keys(mapping).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const corrected = product.configurations.map(row => mapping[configurationId(row)]
    ? { ...row, ...mapping[configurationId(row)], needs_label_review: false } : row);
  const members = new Map<string,string>();
  corrected.filter(row => !row.is_full_set).forEach(row => {
    if (row.is_bundle) row.bundle_component_codes.forEach((code,i) => members.set(code,row.bundle_component_labels[i]));
    else if (row.component_code) members.set(row.component_code,row.public_label);
  });
  const configurations = corrected.map(row => row.is_full_set ? { ...row,
    bundle_component_codes: [...members.keys()], bundle_component_labels: [...members.values()] } : row);
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

/** Owner clarification, 2026-09-16: Etsy1770360776 sells shoulder armor and
 * a belt. The older imported group labels do not mean an extra top or skirt.
 * Keep all three price-row identities and amounts; correct only their contents.
 */
function correctShoulderBeltSet<T extends Record<string, any>>(product: T): T {
  const options = {
    '4b355387-e0bf-48c6-bea7-0c7757707998': { public_label: 'Belt', component_code: 'belt', component_family: 'Belt' },
    '38366d5b-9424-48f3-b9d7-65116841bcaf': { public_label: 'Shoulder Armor', component_code: 'shoulders', component_family: 'Shoulders' },
  };
  const fullSetId = 'c528ae08-b6ec-4538-b46b-48927b29bf5d';
  if (!Array.isArray(product.configurations)
    || ![...Object.keys(options), fullSetId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    if (correction) return { ...row, ...correction, is_bundle: false, is_full_set: false,
      bundle_component_codes: [], bundle_component_labels: [], needs_label_review: false };
    if (configurationId(row) === fullSetId) return { ...row,
      bundle_component_codes: ['shoulders', 'belt'], bundle_component_labels: ['Shoulder Armor', 'Belt'] };
    return row;
  });
  return { ...product, configurations };
}

/** Two equal-price bracelet rows are different body locations. Their exact
 * price-row source labels are "Браслеты на руку" and "Браслеты для ног".
 * This repairs the selector only; it never selects the owner's Legs SEO axis.
 */
function correctAngelLimbOptions<T extends Record<string, any>>(product: T): T {
  const options = {
    '59135d19-b2e1-4943-8bd8-b9154216f3be': { public_label: 'Hand Bracelets', component_code: 'arms', component_family: 'Arms' },
    'cf47bc88-456d-467f-8cb3-393e1f5bf7a8': { public_label: 'Leg Bracelets', component_code: 'legs', component_family: 'Legs' },
  };
  if (!Array.isArray(product.configurations)
    || !Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    if (correction) return { ...row, ...correction, needs_label_review: false };
    if (configurationId(row) === 'b8d5302f-408c-4dec-b7cc-f9cd866b8951') return { ...row,
      bundle_component_codes: ['headpiece', 'wings', 'bodysuit', 'arms', 'legs'],
      bundle_component_labels: ['Headpiece', 'Wings', 'Bodysuit', 'Hand Bracelets', 'Leg Bracelets'] };
    return row;
  });
  return { ...product, configurations };
}

/** Etsy1780952581 has two different grouped options. Its recovered exact RPC
 * attaches Belt+Garters members to Bra+Shoulders as well. Restore each group
 * from its own source option while retaining the original selector/prices.
 */
function correctCosmicGroupedOptions<T extends Record<string, any>>(product: T): T {
  const groups = {
    'b76e941b-be1d-465f-8d73-041b329989de': { codes: ['top', 'shoulders'], labels: ['Top', 'Shoulders'] },
    'da462a0b-721b-4027-8b3c-f6e612415ba6': { codes: ['belt', 'legs'], labels: ['Belt', 'Garters'] },
    '8b84057c-012a-41a3-9523-32a3e97b38f7': { codes: ['choker', 'top', 'shoulders', 'belt', 'legs'], labels: ['Choker', 'Top', 'Shoulders', 'Belt', 'Garters'] },
  };
  if (!Array.isArray(product.configurations)
    || !Object.keys(groups).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  return { ...product, configurations: product.configurations.map(row => {
    const group = groups[configurationId(row)];
    return group ? { ...row, bundle_component_codes: group.codes, bundle_component_labels: group.labels } : row;
  }) };
}

/**
 * Source price rows explicitly say Коричневый / Черный / Зеленый under
 * Основной цвет. All belong to the same source-confirmed chest harness.
 * Preserve every option ID, price and raw field. Brown is the page's default;
 * configuration_color keeps the selector, swatch and price on one variant.
 */
function correctBrownHarnessColors<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const configurations = product.configurations.map((row: Record<string, any>) => {
    const variant = BROWN_HARNESS_COLORS[configurationId(row)];
    if (!variant) return row;
    return {
      ...row,
      public_label: 'Harness',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_color: variant.color,
      sort_order: variant.order,
      needs_label_review: false,
    };
  });
  if (!configurations.some((row: Record<string, any>) => row.configuration_color)) return product;
  return {
    ...product,
    configurations,
    color_options: configurations.filter((row: Record<string, any>) => row.configuration_color)
      .sort((a: Record<string, any>, b: Record<string, any>) => a.sort_order - b.sort_order)
      .map((row: Record<string, any>) => row.configuration_color),
    canonical_color_label: 'Brown',
    needs_label_review: configurations.some((row: Record<string, any>) => row.needs_label_review === true),
  };
}

/**
 * Owner clarification, 2026-09-15: the option imported as Shoulders is the
 * complete strapped top. Its small shoulder details are integrated, not a
 * separate product part. This correction follows that explicit clarification,
 * not a checkbox or photo inference. Preserve the option identity and prices.
 */
function correctCosmicTopSkirtSet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  if (!product.configurations.some((row: Record<string, any>) => configurationId(row) === COSMIC_TOP_OPTION_ID)) return product;
  const configurations = product.configurations.map((row: Record<string, any>) => {
    if (configurationId(row) === COSMIC_TOP_OPTION_ID) {
      return { ...row, public_label: 'Top', component_code: 'top', component_family: 'Top', needs_label_review: false };
    }
    if (!Array.isArray(row.bundle_component_codes) || !row.bundle_component_codes.includes('shoulders')) return row;
    return {
      ...row,
      bundle_component_codes: row.bundle_component_codes.map((code: string) => code === 'shoulders' ? 'top' : code),
      ...(Array.isArray(row.bundle_component_labels) ? {
        bundle_component_labels: row.bundle_component_labels.map((label: string) => /^shoulders?$/i.test(label) ? 'Top' : label),
      } : {}),
    };
  });
  return { ...product, configurations };
}

/**
 * Etsy 4487639486 exposes exactly four current selector choices:
 * `Bracelet`, `Skirt`, `Top + Shoulders`, and `Full Set`. The recovered feed
 * kept those choices but attached only Bracelet + Skirt to Full Set, omitting
 * the two declared members of the grouped `Top + Shoulders` choice. The source
 * description and primary image independently show the same complete outfit.
 *
 * Keep every raw row untouched and repair only the current storefront offer.
 * The separate-price total must include the grouped choice once; otherwise
 * the PDP compares Full Set with only two of the three separately purchasable
 * choices and hides the real bundle saving.
 */
function correctSilverMensWarriorSet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;

  const separateIds = new Set(SILVER_MENS_WARRIOR_SEPARATE_OPTION_IDS);
  const separateRows = product.configurations.filter((row: Record<string, any>) => (
    separateIds.has(configurationId(row))
  ));
  if (separateRows.length !== SILVER_MENS_WARRIOR_SEPARATE_OPTION_IDS.length) return product;

  const configurations = product.configurations.map((row: Record<string, any>) => {
    if (row.is_full_set !== true) return row;
    return {
      ...row,
      bundle_component_codes: SILVER_MENS_WARRIOR_FULL_SET_ORDER.map((member) => member.code),
      bundle_component_labels: SILVER_MENS_WARRIOR_FULL_SET_ORDER.map((member) => member.label),
    };
  });
  const fullSetRow = configurations.find((row: Record<string, any>) => row.is_full_set === true);
  if (!fullSetRow) return product;

  const separateTotal = separateRows.reduce((sum: number, row: Record<string, any>) => {
    const price = numeric(row.display_price_amount)
      ?? numeric(row.base_price_amount)
      ?? numeric(row.public_price_amount);
    return price == null ? sum : sum + price;
  }, 0);
  const fullSetPrice = numeric(fullSetRow.display_price_amount)
    ?? numeric(fullSetRow.base_price_amount)
    ?? numeric(fullSetRow.public_price_amount);
  const savings = fullSetPrice != null && separateTotal > fullSetPrice
    ? separateTotal - fullSetPrice
    : null;

  return {
    ...product,
    configurations,
    component_sum_display_price_amount: separateTotal || product.component_sum_display_price_amount,
    full_set_savings_amount: savings,
    full_set_savings_percent: savings != null && separateTotal > 0
      ? Math.round((savings / separateTotal) * 10000) / 100
      : null,
  };
}
