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

const SILVER_ROBOT_ARMS_ID = '3a006050-ab78-4b4d-9964-ed8c9f32e923';
const SILVER_BRA_SKIRT_SET_ID = '81fc83de-76aa-4733-9a88-f631e7699fa6';
const PINK_RAVE_BODYSUIT_ID = 'a97ca78f-ed0d-4f17-a18d-8d54efd2679a';
const BATCH28_MENS_CHEST_HARNESS_ID = '88d4332c-95bc-4859-a31e-33d6ee89fb4d';
const BATCH28_WOMENS_HARNESS_SET_ID = 'c3f1018e-665b-44a8-90db-ecc5bb64eedc';
const BATCH28_SILVER_BRA_PANTY_ID = 'fdd42158-087b-4190-9eb8-fda7f7460258';
const BATCH28_RED_CORSET_SKIRT_ID = '665296a0-f5ad-422c-837c-868f611c45c6';
const BATCH28_GOLD_SPINE_TAIL_ID = 'd17c17b6-76dd-429d-bf5c-ccd432cd1e0f';
const BATCH29_CAPTAIN_ARMOR_ID = 'e51e0a66-8358-41f9-bd51-2ab4833b24b3';
const BATCH29_WHITE_MENS_ARMOR_ID = 'b0b2a75c-f301-45d6-857c-dd6575862619';
const BATCH29_PLAGUE_DOCTOR_ID = '98600aa8-307b-4165-a8ae-38e347c114bd';
const BATCH29_RED_DRAGON_ID = '27786636-7021-4809-8e81-7f566a3436ae';
const BATCH30_NECKLACE_BELT_ID = 'abf11fbb-9794-484d-b93c-1449fa3a9a44';
const BATCH30_SILVER_BELT_PANTIES_ID = 'f27fdb4d-d007-4d4c-899c-a50728c1ea4d';
const BATCH30_FULL_BODY_HARNESS_ID = '11bb0057-8c1f-4347-8c03-46856df0653c';
const BATCH30_HOLO_WINGS_ID = '12a0faf1-9c3c-44e2-bbf1-1583ac309a46';
const BATCH30_DESERT_WARRIOR_ID = '7bf47f01-8114-4e8f-ba96-632f0fdd8d7d';
const BATCH31_GOLD_BRA_SKIRT_ID = '9c845a5a-666a-47b4-99d6-9f0a393bfa1c';
const BATCH31_SILVER_CORSET_ID = 'f36acd08-1591-4e15-8ad2-96bc22ec4b77';
const BATCH31_BUTTERFLY_ID = '8242d255-f77f-4e9f-88a2-a5db326fa297';
const BATCH31_GOLD_HORNS_ID = '8b4e23fd-456e-462b-a6b3-8aaa0333debe';
const BATCH31_GODDESS_HEADPIECE_ID = '5e034423-6c04-459b-b7d7-0d10ad564c4e';
const BATCH32_SILVER_ARMOR_ID = '85752f94-b2d7-465e-ace2-40bb77977461';
const BATCH32_FEMALE_WARRIOR_ID = 'ec204df6-13b6-4deb-b493-04391501d72d';
const BATCH32_CAT_COSTUME_ID = 'c7b07eb1-d003-471b-a3f9-40b1c98edc19';
const BATCH32_CORSET_SKIRT_ID = 'fba170e8-582d-45fa-b954-f9136e733950';
const BATCH32_GOLD_ARM_ARMOR_ID = '0395cb11-424f-407f-a849-7ee3b617ab57';
const BATCH33_GOGO_ID = '09f51ad4-6b90-4311-aa5a-54f91cf4b7bf';
const BATCH33_GOLD_TOP_SKIRT_ID = 'a9fa4b69-4f79-4669-bd60-783a05d12296';
const BATCH33_BLACK_PUNK_ID = 'a606be83-50aa-462d-ae54-04e9ce7aeb3b';
const BATCH33_MENS_SUSPENDERS_ID = '882793f6-15ca-4617-a579-5cd47290ce72';
const BATCH33_DARK_WITCH_ID = '340b160f-93e3-4389-866f-df79cc14dea8';
const BATCH34_SILVER_BRA_SKIRT_ID = '9d1d101d-e1d1-48fd-ac41-65c07dd5ce05';
const BATCH34_COUPLE_OUTFITS_ID = '8f4646f0-ea2b-48c3-af11-e22f0dec4f08';
const BATCH34_HOLO_WINGS_ID = '74634519-add3-490f-8ef3-3b4d74a7ca7d';
const BATCH34_PINK_BODYSUIT_ID = 'c61827ef-4530-426b-a2bf-7a44738352af';
const BATCH34_GOLD_HORNS_ID = '8223ea35-644b-4bd8-bd05-4ba7810b116a';
const BATCH35_SILVER_ROBOT_ID = '13300fb8-c39d-476f-9485-75747c4e6599';
const BATCH35_COUPLE_PAIRED_ID = 'a759b44e-1329-47a6-a444-0c9feabcc0ce';
const BATCH35_SILVER_DANCE_ID = 'b9e7bdbd-1edd-41c5-af9e-8f3799469715';
const BATCH35_DESERT_GODDESS_ID = '481ca9fa-1100-439d-b52b-80caadba52a9';
const BATCH35_SILVER_ARMOR_COMBOS_ID = '818a1991-46e2-4628-ac61-6db77314c9af';
const BATCH36_DANCE_SPINE_TAIL_ID = 'a9f110dc-4ed4-454f-9e28-f67ca5a042e1';
const BATCH36_SILVER_CORSET_LEGS_ID = 'a6beccc2-bbd3-4040-8e29-af06efd6dd97';
const BATCH36_WARRIOR_PRINCESS_ID = '0b7e5ccd-f5a3-4dd7-877f-1e21fbda9486';
const BATCH36_ANGEL_ARMOR_QTY_ID = 'a7109e93-df1f-43a6-bb6f-62bdf74e4c4f';
const BATCH36_SILVER_SPINE_ID = '31bde143-e483-454b-a397-14bcffa47f20';
const BATCH37_WINGS_ID = 'c661cd70-55e4-445e-97ab-591e22d02221';
const BATCH37_GOLD_BRA_SKIRT_ID = '330fd9bc-f3d0-4eec-8e98-b36fb490b486';
const BATCH37_COUPLE_ID = 'f012a88f-44db-4e17-ba57-7f60bb7b5719';
const BATCH37_SUSPENDERS_ID = '7cf4ea37-cd11-4203-860c-7eed4ae965ba';
const BATCH37_DARK_WITCH_ID = '83ea907b-a523-47cf-834f-5a1b16b80339';
const BATCH38_GOLD_HORNS_ID = 'b18d342a-c323-4f11-8c98-d5eb5f543e12';
const BATCH38_COUPLE_GOLD_ID = 'fefd1c3e-2fd1-47c9-970f-c30962c1a737';
const BATCH38_COUPLE_ALT_ID = '5bf3df64-84dc-4baf-84bd-8a94e1b06ccb';
const BATCH38_WARRIOR_PRINCESS_ID = '679c975c-b309-49dc-9207-f89fc96b84d1';
const BATCH39_WHITE_ROBOT_QTY_ID = 'ebd949d5-6596-4a7c-aec7-11e258dae417';
const FINAL_GOLD_ARMOR_VARIANTS_ID = '437a20cd-27a3-4aaf-b154-3353899e0ebd';















function correctFinalGoldArmorVariants<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;

  // Etsy 1902238173 exposes four source-confirmed numbered choices.
  // The exact RPC preserves all four price rows but normalizes every public
  // label to "Option", so storefront.ts de-duplicates them by label and shows
  // only the highest-priced row. Restore the source variant identities only;
  // prices and raw source rows remain untouched.
  const labels: Record<string, { public_label: string; sort_order: number }> = {
    '899e0b93-6222-4208-9d3a-218e4747b982': { public_label: 'Variant #1', sort_order: 1 },
    'a737ac7d-bff8-4325-b101-fa934bb1d322': { public_label: 'Variant #2', sort_order: 2 },
    '3ae4183d-f178-4231-a551-5c874520a25a': { public_label: 'Variant #3', sort_order: 3 },
    'dce0b722-5c5b-4b2b-81c4-032c1d295a53': { public_label: 'Variant #4', sort_order: 4 },
  };

  if (!Object.keys(labels).every((id) => product.configurations.some(
    (row: Record<string, any>) => configurationId(row) === id,
  ))) return product;

  const configurations = product.configurations.map((row: Record<string, any>) => {
    const correction = labels[configurationId(row)];
    return correction
      ? { ...row, ...correction, needs_label_review: false }
      : row;
  });

  return {
    ...product,
    configurations,
    needs_label_review: configurations.some((row: Record<string, any>) => row.needs_label_review === true),
  };
}

function correctBatch39WhiteRobotQty<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;

  const options: Record<string, Record<string, any>> = {
    'ae3f72cc-0016-4db5-9672-923207a900f2': {
      public_label: 'One Arm Armor',
      component_code: 'arm_x1',
      component_family: 'Arms',
      is_bundle: false,
      is_full_set: false,
      sort_order: 1,
    },
    '48134eaf-66da-40c2-bd2d-e996f313aea6': {
      public_label: 'One Leg Armor',
      component_code: 'leg_x1',
      component_family: 'Legs',
      is_bundle: false,
      is_full_set: false,
      sort_order: 2,
    },
    '45ea1065-4e25-406c-85f3-d6871129b551': {
      public_label: 'One Arm + Leg Armor',
      component_code: 'arm_leg_x1',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['arm_x1','leg_x1'],
      bundle_component_labels: ['One Arm Armor','One Leg Armor'],
      sort_order: 3,
    },
    '6fbe98e5-d0dd-42b7-80a4-86a43e021be2': {
      public_label: 'Both Legs Armor x2',
      component_code: 'legs_x2',
      component_family: 'Legs',
      is_bundle: false,
      is_full_set: false,
      sort_order: 4,
    },
    'd44685a6-b1eb-4c25-8fd7-dab8d6b08f77': {
      public_label: 'Both Arms Armor x2',
      component_code: 'arms_x2',
      component_family: 'Arms',
      is_bundle: false,
      is_full_set: false,
      sort_order: 5,
    },
    '83a7ce93-264d-4d67-b8dd-c6fc40cce43b': {
      public_label: 'Both Arms + Legs',
      component_code: 'arms_legs_x2',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['arms_x2','legs_x2'],
      bundle_component_labels: ['Both Arms Armor x2','Both Legs Armor x2'],
      sort_order: 6,
    },
  };

  if (!Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) {
    return product;
  }

  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    return correction ? { ...row, ...correction, needs_label_review: false } : row;
  });

  return {
    ...product,
    configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true),
  };
}

function correctBatch38GoldHorns<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const newHornsId = 'bdd688f1-89ae-40bc-b719-764be316f195';
  const oldHornsId = '52ed0d19-6dfc-4efb-8299-e531f65ab809';
  const newFullId = 'b076f47f-ffd9-4e82-b561-2308545b917a';
  const oldFullId = '06540bbe-6a6e-4bf9-a6fb-1268c6224574';
  if (![newHornsId, oldHornsId, newFullId, oldFullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === newHornsId) return {
      ...row,
      public_label: 'Horns (New)',
      component_code: 'horns_new',
      component_family: 'Headpiece',
      configuration_variant: 'New Horns',
      sort_order: 1,
      needs_label_review: false
    };
    if (id === oldHornsId) return {
      ...row,
      public_label: 'Horns (Old)',
      component_code: 'horns_old',
      component_family: 'Headpiece',
      configuration_variant: 'Old Horns',
      sort_order: 2,
      needs_label_review: false
    };
    if (id === newFullId) return {
      ...row,
      public_label: 'Full Set (New Horns)',
      component_code: 'full_set',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['legs','horns_new','bodysuit','corset','boots'],
      bundle_component_labels: ['Leg Covers','Horns (New)','Bodysuit','Corset','Boots'],
      source_confirmed_bundle_members: true,
      sort_order: 6,
      needs_label_review: false
    };
    if (id === oldFullId) return {
      ...row,
      public_label: 'Full Set (Old Horns)',
      component_code: 'full_set',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['legs','horns_old','bodysuit','corset','boots'],
      bundle_component_labels: ['Leg Covers','Horns (Old)','Bodysuit','Corset','Boots'],
      source_confirmed_bundle_members: true,
      sort_order: 7,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch38CoupleGold<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const womenId = '375db1bb-bbc0-4e29-ace5-d7f2c4db334e';
  const menId = '4b5cb858-4867-41da-97d3-96bc24dc8bb7';
  const pairId = '5f9235ae-80e4-483c-98b3-ae7a496dc47b';
  if (![womenId, menId, pairId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === womenId) return {
      ...row, public_label: "Women's Outfit", component_code: 'women_outfit', component_family: 'Outfit',
      configuration_audience: 'Women', sort_order: 1, needs_label_review: false
    };
    if (id === menId) return {
      ...row, public_label: "Men's Outfit", component_code: 'men_outfit', component_family: 'Outfit',
      configuration_audience: 'Men', sort_order: 2, needs_label_review: false
    };
    if (id === pairId) return {
      ...row, public_label: 'Paired Set', component_code: 'full_set', component_family: 'Bundle',
      is_bundle: true, is_full_set: true,
      bundle_component_codes: ['women_outfit','men_outfit'],
      bundle_component_labels: ["Women's Outfit","Men's Outfit"],
      source_confirmed_bundle_members: true, sort_order: 3, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch38CoupleAlt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const womenId = '49024424-15b0-4e6f-9e7c-8bcb58b85b55';
  const menId = '8d8f64b7-1f64-41a4-b38b-9aa6d20db47f';
  const pairId = '619990bd-8e27-4996-bb32-2f1ca9a6c32f';
  if (![womenId, menId, pairId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === womenId) return {
      ...row, public_label: "Women's Outfit", component_code: 'women_outfit', component_family: 'Outfit',
      configuration_audience: 'Women', sort_order: 1, needs_label_review: false
    };
    if (id === menId) return {
      ...row, public_label: "Men's Outfit", component_code: 'men_outfit', component_family: 'Outfit',
      configuration_audience: 'Men', sort_order: 2, needs_label_review: false
    };
    if (id === pairId) return {
      ...row, public_label: 'Paired Set', component_code: 'full_set', component_family: 'Bundle',
      is_bundle: true, is_full_set: true,
      bundle_component_codes: ['women_outfit','men_outfit'],
      bundle_component_labels: ["Women's Outfit","Men's Outfit"],
      source_confirmed_bundle_members: true, sort_order: 3, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch38WarriorPrincess<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const harnessId = '62452a71-f39d-47dc-b06f-30a5538e7ddc';
  const braceletId = '660fe03c-7f9e-4bd4-aecd-fac1c2fe091d';
  const fullId = 'cd0f6cc3-7c72-430a-822f-a1059674208a';
  if (![harnessId, braceletId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === harnessId) return {
      ...row, public_label: 'Top Harness', component_code: 'harness', component_family: 'Harness', needs_label_review: false
    };
    if (id === braceletId) return {
      ...row, public_label: 'Arm Bracelet', component_code: 'arms', component_family: 'Arms', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['harness','shoulders','arms','legs'],
      bundle_component_labels: ['Top Harness','Shoulder','Arm Bracelet','Leg Garters'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch37Wings<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const handId = 'a10301aa-12b3-4214-9ae9-d0557dc3e215';
  const legId = 'b58d15a7-d927-4d98-94b4-66d955b2334f';
  const fullId = '17e1d28f-3f3d-43c3-b343-eb74afaf3907';
  if (![handId, legId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === handId) return {
      ...row, public_label: 'Hand Bracelets', component_code: 'arms', component_family: 'Arms', needs_label_review: false
    };
    if (id === legId) return {
      ...row, public_label: 'Leg Bracelets', component_code: 'legs', component_family: 'Legs', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','legs','headpiece','bodysuit','wings'],
      bundle_component_labels: ['Hand Bracelets','Leg Bracelets','Headpiece','Bodysuit','Wings'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch37GoldBraSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = 'ff6758fd-2cd5-4107-a13e-77f47ddac0db';
  const fullId = 'bcf94dc8-4112-47d6-bfbf-f40491f988f7';
  if (![braId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return {
      ...row, public_label: 'Bra Only', component_code: 'top', component_family: 'Top', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top','skirt'],
      bundle_component_labels: ['Bra Only','Skirt Only'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch37Couple<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const womenId = '75e8307a-7c4a-4adf-ae71-f08fd3b13aab';
  const menId = 'a7285f00-d858-4f09-a2da-00e54233368b';
  const pairId = '6af8ef45-5709-4635-8149-e0254659fef5';
  if (![womenId, menId, pairId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === womenId) return {
      ...row,
      public_label: "Women's Outfit",
      component_code: 'women_outfit',
      component_family: 'Outfit',
      configuration_audience: 'Women',
      sort_order: 1,
      needs_label_review: false
    };
    if (id === menId) return {
      ...row,
      public_label: "Men's Outfit",
      component_code: 'men_outfit',
      component_family: 'Outfit',
      configuration_audience: 'Men',
      sort_order: 2,
      needs_label_review: false
    };
    if (id === pairId) return {
      ...row,
      public_label: 'Paired Set',
      component_code: 'full_set',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: true,
      bundle_component_codes: ['women_outfit','men_outfit'],
      bundle_component_labels: ["Women's Outfit","Men's Outfit"],
      source_confirmed_bundle_members: true,
      sort_order: 3,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch37Suspenders<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const options: Record<string, Record<string, any>> = {
    '66058dbc-f8ed-4189-ba0e-464204df96df': {
      public_label: 'Brown Suspenders', component_code: 'harness', component_family: 'Harness',
      configuration_color: 'Brown', sort_order: 1
    },
    '12298554-1ab7-4071-a222-3ff871a44a2e': {
      public_label: 'Black Suspenders', component_code: 'harness', component_family: 'Harness',
      configuration_color: 'Black', sort_order: 2
    },
    '27d80896-cc1e-4c7e-8e85-204a686e317f': {
      public_label: 'Green Suspenders', component_code: 'harness', component_family: 'Harness',
      configuration_color: 'Green', sort_order: 3
    }
  };
  if (!Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    return correction ? { ...row, ...correction, needs_label_review: false } : row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch37DarkWitch<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const corsetSpineId = '0ec705e6-cf4d-42fe-a38c-4f1340d1e5d1';
  const hornsSpineId = 'deb26bff-b5ae-4d06-8c3f-0dae26e1baad';
  const hornsCorsetId = '13de4045-7a59-4ab9-a04f-f0829159c41e';
  const fullId = '2d9a949d-fbb2-4da4-a282-e05aa13d8c14';
  if (![corsetSpineId, hornsSpineId, hornsCorsetId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === corsetSpineId) return {
      ...row,
      public_label: 'Corset + Spine',
      component_code: 'corset_spine',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['corset','spine'],
      bundle_component_labels: ['Corset','Spine'],
      needs_label_review: false
    };
    if (id === hornsSpineId) return {
      ...row,
      public_label: 'Horns + Spine',
      component_code: 'horns_spine',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['horns','spine'],
      bundle_component_labels: ['Horns','Spine'],
      needs_label_review: false
    };
    if (id === hornsCorsetId) return {
      ...row,
      public_label: 'Horns + Corset',
      component_code: 'horns_corset',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['horns','corset'],
      bundle_component_labels: ['Horns','Corset'],
      needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['corset','spine','horns'],
      bundle_component_labels: ['Corset','Spine','Horns'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch36DanceSpineTail<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const spineTailId = 'd97f43bd-2d3c-4ebd-94b1-8ce0ca69635e';
  const fullId = '0901f124-d832-40f4-aa3b-1dc2b20e0b8c';
  if (![spineTailId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === spineTailId) return {
      ...row,
      public_label: 'Spine + Tail',
      component_code: 'spine_tail',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['spine','tail'],
      bundle_component_labels: ['Spine','Tail'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['skirt','legs','spine','tail','bodysuit'],
      bundle_component_labels: ['Skirt','Leg Covers','Spine','Tail','Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch36SilverCorsetLegs<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const legBraceletsId = 'd42558a3-480f-4c01-9b2b-5d240cb42317';
  const fullId = '993bf1da-692e-4949-abc3-0b5097470ae7';
  if (![legBraceletsId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === legBraceletsId) return {
      ...row,
      public_label: 'Leg Bracelets',
      component_code: 'leg_bracelets',
      component_family: 'Legs',
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['leg_bracelets','legs','corset'],
      bundle_component_labels: ['Leg Bracelets','Garters','Corset'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch36WarriorPrincess<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const harnessId = 'de582e95-5729-4d44-9b3e-95161a979278';
  const braceletId = '0096778a-a054-47d3-a158-1c1ec636d8fd';
  const shoulderBraceletId = 'e9bd5c59-d9a4-4b65-b57c-bf2860aaa4d1';
  const fullId = '5233fb65-7ff7-4177-885d-1455fc8b9aa0';
  if (![harnessId, braceletId, shoulderBraceletId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === harnessId) return {
      ...row, public_label: 'Top Harness', component_code: 'harness', component_family: 'Harness', needs_label_review: false
    };
    if (id === braceletId) return {
      ...row, public_label: 'Arm Bracelet', component_code: 'arms', component_family: 'Arms', needs_label_review: false
    };
    if (id === shoulderBraceletId) return {
      ...row,
      public_label: 'Shoulder + Bracelet',
      component_code: 'shoulder_bracelet',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['shoulders','arms'],
      bundle_component_labels: ['Shoulder','Arm Bracelet'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['harness','shoulders','arms','legs'],
      bundle_component_labels: ['Top Harness','Shoulder','Arm Bracelet','Leg Garters'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch36AngelArmorQty<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const shoulder1 = '84941441-d77e-41c9-bed9-94611553a975';
  const shoulder2 = '7d88e8f4-ade9-4ff3-85af-497e0e5f6961';
  const arm1 = '423d53ec-0a4d-4dc1-8bcf-6224a0c9b0ca';
  const arm2 = 'be10cdf7-dd19-4a47-8d5d-15fbb761114f';
  const full1 = 'fe93bdb2-824c-4669-a58c-4bb3a377f2ef';
  const full2 = '91993da0-b771-4215-ba1c-6edabf0737ad';
  if (![shoulder1, shoulder2, arm1, arm2, full1, full2].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === shoulder1) return {
      ...row, public_label: 'Shoulder x1', component_code: 'shoulder_x1', component_family: 'Shoulders', sort_order: 1, needs_label_review: false
    };
    if (id === shoulder2) return {
      ...row, public_label: 'Shoulders x2', component_code: 'shoulders_x2', component_family: 'Shoulders', sort_order: 2, needs_label_review: false
    };
    if (id === arm1) return {
      ...row, public_label: 'Arm Cover x1', component_code: 'arm_cover_x1', component_family: 'Arms', sort_order: 3, needs_label_review: false
    };
    if (id === arm2) return {
      ...row, public_label: 'Arm Covers x2', component_code: 'arm_covers_x2', component_family: 'Arms', sort_order: 4, needs_label_review: false
    };
    if (id === full1) return {
      ...row,
      public_label: 'Full Set x1',
      component_code: 'full_set',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['shoulder_x1','arm_cover_x1'],
      bundle_component_labels: ['Shoulder x1','Arm Cover x1'],
      source_confirmed_bundle_members: true,
      sort_order: 5,
      needs_label_review: false,
    };
    if (id === full2) return {
      ...row,
      public_label: 'Full Set x2',
      component_code: 'full_set',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['shoulders_x2','arm_covers_x2'],
      bundle_component_labels: ['Shoulders x2','Arm Covers x2'],
      source_confirmed_bundle_members: true,
      sort_order: 6,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch36SilverSpine<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const beltGartersId = '260e1e5f-b933-4315-a216-86bfc840d83e';
  const braShouldersId = '8a01e45a-1278-4215-bbe9-92603659c9b4';
  const fullId = 'c45dfaca-600d-46ef-b6a7-556de132d0e1';
  if (![beltGartersId, braShouldersId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === beltGartersId) return {
      ...row,
      public_label: 'Belt + Garters',
      component_code: 'belt_garters',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['belt','legs'],
      bundle_component_labels: ['Belt','Garters'],
      needs_label_review: false,
    };
    if (id === braShouldersId) return {
      ...row,
      public_label: 'Bra + Shoulders',
      component_code: 'bra_shoulders',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['top','shoulders'],
      bundle_component_labels: ['Bra','Shoulders'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['spine','belt','legs','top','shoulders'],
      bundle_component_labels: ['Spine','Belt','Garters','Bra','Shoulders'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch35SilverRobot<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const armId = '1b0f4316-bc85-4556-bfab-014ed9e2d1d1';
  const fullId = 'e97abcfb-98e4-46f0-b631-1321cbad10cf';
  if (![armId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === armId) return {
      ...row, public_label: 'Arm Covers', component_code: 'arms', component_family: 'Arms', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','shoulders','legs','belt'],
      bundle_component_labels: ['Arm Covers','Shoulders','Leg Covers','Belt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch35CouplePaired<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const womenId = 'c5e525cb-3b26-4df7-af42-e63a399127d5';
  const menId = '6653af11-a640-423a-b355-3c64ccaa94af';
  const pairId = '6a68bce4-4a2c-4419-a3a1-2a85f1aa80af';
  if (![womenId, menId, pairId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === womenId) return {
      ...row, public_label: "Women's Outfit", component_code: 'women_outfit', component_family: 'Outfit',
      configuration_audience: 'Women', sort_order: 1, needs_label_review: false
    };
    if (id === menId) return {
      ...row, public_label: "Men's Outfit", component_code: 'men_outfit', component_family: 'Outfit',
      configuration_audience: 'Men', sort_order: 2, needs_label_review: false
    };
    if (id === pairId) return {
      ...row, public_label: 'Paired Set', component_code: 'full_set', component_family: 'Bundle',
      is_bundle: true, is_full_set: true,
      bundle_component_codes: ['women_outfit','men_outfit'],
      bundle_component_labels: ["Women's Outfit","Men's Outfit"],
      source_confirmed_bundle_members: true,
      sort_order: 3, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch35SilverDance<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const topSkirtId = '7f1d8eb0-bb9a-49dd-9667-ab40cb313145';
  const topPantiesId = 'd77e1f68-e882-467a-8041-e2cb4e282d2c';
  const trioId = 'd7195ac0-128f-4347-bc2e-aa36d856a1b5';
  if (![topSkirtId, topPantiesId, trioId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === topSkirtId) return {
      ...row, public_label: 'Top + Skirt', component_code: 'top_skirt', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','skirt'], bundle_component_labels: ['Top','Skirt'], needs_label_review: false
    };
    if (id === topPantiesId) return {
      ...row, public_label: 'Top + Panties', component_code: 'top_panties', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','panties'], bundle_component_labels: ['Top','Panties'], needs_label_review: false
    };
    if (id === trioId) return {
      ...row, public_label: 'Top + Skirt + Panties', component_code: 'top_skirt_panties', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','skirt','panties'], bundle_component_labels: ['Top','Skirt','Panties'],
      source_confirmed_bundle_members: true, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch35DesertGoddess<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const groupedId = '7363b8a0-1eb9-4972-b476-71b5783467ea';
  const fullId = 'ffbf2114-be94-4d15-834b-7db3ad693862';
  if (![groupedId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === groupedId) return {
      ...row, public_label: 'Top + Shoulders', component_code: 'top_shoulders', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','shoulders'], bundle_component_labels: ['Top','Shoulders'],
      needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['skirt','top','shoulders'],
      bundle_component_labels: ['Skirt','Top','Shoulders'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch35SilverArmorCombos<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const topSkirtId = '68332766-581a-446f-bf94-191672a0744f';
  const topShouldersId = 'cae9a15c-c04f-4335-89b8-c5e1b1527d71';
  const trioId = 'bf0af5a4-dbd7-4d86-bd0b-646822f0a4b0';
  const fullId = 'b40753e5-665a-49e6-ba10-46e54b0bf22a';
  if (![topSkirtId, topShouldersId, trioId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id)
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === topSkirtId) return {
      ...row, public_label: 'Top + Skirt', component_code: 'top_skirt', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','skirt'], bundle_component_labels: ['Top','Skirt'], needs_label_review: false
    };
    if (id === topShouldersId) return {
      ...row, public_label: 'Top + Shoulders', component_code: 'top_shoulders', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','shoulders'], bundle_component_labels: ['Top','Shoulders'], needs_label_review: false
    };
    if (id === trioId) return {
      ...row, public_label: 'Top + Skirt + Panties', component_code: 'top_skirt_panties', component_family: 'Bundle',
      is_bundle: true, is_full_set: false,
      bundle_component_codes: ['top','skirt','panties'], bundle_component_labels: ['Top','Skirt','Panties'], needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top','shoulders','skirt','panties'],
      bundle_component_labels: ['Top','Shoulders','Skirt','Panties'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch34SilverBraSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = '1991c64a-04bc-4445-a9cc-f3b3f09f7a66';
  const fullId = 'bc81f075-cda9-4eb3-9233-20646b315f63';
  if (![braId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return {
      ...row,
      public_label: 'Bra',
      component_code: 'top',
      component_family: 'Top',
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top','skirt'],
      bundle_component_labels: ['Bra','Skirt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch34CoupleOutfits<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const menId = 'a0bef7cc-1cf1-470c-af16-d77c13a457f6';
  const womenId = '3526fd7a-cad5-456a-b1f2-8327d95966e7';
  if (![menId, womenId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === womenId) return {
      ...row,
      public_label: "Women's Outfit",
      component_code: 'women_outfit',
      component_family: 'Outfit',
      configuration_audience: 'Women',
      sort_order: 1,
      needs_label_review: false,
    };
    if (id === menId) return {
      ...row,
      public_label: "Men's Outfit",
      component_code: 'men_outfit',
      component_family: 'Outfit',
      configuration_audience: 'Men',
      sort_order: 2,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch34HoloWings<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const handId = 'ad6b5b46-64d4-4f6a-a0b3-b5fcf782b722';
  const legId = '9116628c-d672-4a97-bcb0-1180aef501c4';
  const fullId = 'cf3bd456-c57b-421f-819a-11612a8e8bc7';
  if (![handId, legId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === handId) return {
      ...row,
      public_label: 'Hand Bracelets',
      component_code: 'arms',
      component_family: 'Arms',
      needs_label_review: false,
    };
    if (id === legId) return {
      ...row,
      public_label: 'Leg Bracelets',
      component_code: 'legs',
      component_family: 'Legs',
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','legs','headpiece','bodysuit','wings'],
      bundle_component_labels: ['Hand Bracelets','Leg Bracelets','Headpiece','Bodysuit','Wings'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch34PinkBodysuit<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const sleevesLegsId = 'fabc18be-e918-44cb-ab58-5894e21f25fc';
  const fullId = '014b5b68-ca7e-478c-9d8f-5a37b67b3d83';
  if (![sleevesLegsId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === sleevesLegsId) return {
      ...row,
      public_label: 'Sleeves + Leg Covers',
      component_code: 'sleeves_legs',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['arms','legs'],
      bundle_component_labels: ['Sleeves','Leg Covers'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['bodysuit','shoulders','arms','legs'],
      bundle_component_labels: ['Bodysuit','Shoulders','Sleeves','Leg Covers'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch34GoldHorns<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const newHornsId = 'b147aea3-8bf7-4a16-b4b0-610e962cc58c';
  const oldHornsId = '8adcff72-3599-429b-873d-48887f46b096';
  const newFullId = '7265ce35-20ca-41f2-b1c7-0892db93f805';
  const oldFullId = '4957f3e1-9fed-4360-a34e-3192bddf9b06';
  if (![newHornsId, oldHornsId, newFullId, oldFullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === newHornsId) return {
      ...row,
      public_label: 'Horns (New)',
      component_code: 'horns_new',
      component_family: 'Headpiece',
      configuration_variant: 'New Horns',
      sort_order: 1,
      needs_label_review: false,
    };
    if (id === oldHornsId) return {
      ...row,
      public_label: 'Horns (Old)',
      component_code: 'horns_old',
      component_family: 'Headpiece',
      configuration_variant: 'Old Horns',
      sort_order: 2,
      needs_label_review: false,
    };
    if (id === newFullId) return {
      ...row,
      public_label: 'Full Set (New Horns)',
      component_code: 'full_set_new_horns',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['legs','horns_new','bodysuit','corset','boots'],
      bundle_component_labels: ['Leg Covers','Horns (New)','Bodysuit','Corset','Boots'],
      source_confirmed_bundle_members: true,
      sort_order: 6,
      needs_label_review: false,
    };
    if (id === oldFullId) return {
      ...row,
      public_label: 'Full Set (Old Horns)',
      component_code: 'full_set_old_horns',
      component_family: 'Bundle',
      is_full_set: true,
      bundle_component_codes: ['legs','horns_old','bodysuit','corset','boots'],
      bundle_component_labels: ['Leg Covers','Horns (Old)','Bodysuit','Corset','Boots'],
      source_confirmed_bundle_members: true,
      sort_order: 7,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch33GoGo<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const groupedId = 'b1368ad3-bf47-4b33-85de-075f9e3b59d4';
  const fullId = '7869ea43-14f0-4ec0-93f3-5e27aeca61d3';
  if (![groupedId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === groupedId) return {
      ...row,
      public_label: 'Bodysuit + Leg Covers',
      component_code: 'bodysuit_legs',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['bodysuit','legs'],
      bundle_component_labels: ['Bodysuit','Leg Covers'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['skirt','legs','bodysuit'],
      bundle_component_labels: ['Skirt','Leg Covers','Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch33GoldTopSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = '95a37f98-fd4a-4d58-856a-0aae63cfc356';
  const fullId = '8eaecdf5-89d4-48bb-89de-d6b00199a86d';
  if (![braId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return {
      ...row, public_label: 'Bra', component_code: 'top', component_family: 'Top', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['skirt','top'],
      bundle_component_labels: ['Skirt','Bra'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch33BlackPunk<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const groupedId = '157067db-2982-4f1f-9f0b-37cab846a51a';
  const fullId = '1c064cd6-426e-47ea-8286-257694320da6';
  if (![groupedId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === groupedId) return {
      ...row,
      public_label: 'Bodysuit + Shoulders',
      component_code: 'bodysuit_shoulders',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['bodysuit','shoulders'],
      bundle_component_labels: ['Bodysuit','Shoulders'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['shoulders','headpiece','bodysuit'],
      bundle_component_labels: ['Shoulders','Headpiece','Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch33MensSuspenders<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const options: Record<string, Record<string, any>> = {
    'ac83c38f-b1b7-420f-b0a9-7ff5b7eb3b4a': {
      public_label: 'Black Suspenders',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_color: 'Black',
      sort_order: 1,
    },
    '86d29b33-ef45-49cf-8682-a7685f4596bf': {
      public_label: 'Green Suspenders',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_color: 'Green',
      sort_order: 2,
    },
    '9cf4b355-2c03-4c05-b5ba-2ca8c49ab572': {
      public_label: 'Brown Suspenders',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_color: 'Brown',
      sort_order: 3,
    },
  };
  if (!Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    return correction ? { ...row, ...correction, needs_label_review: false } : row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch33DarkWitch<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const corsetSpineId = '5c021829-cffc-4374-ab4e-d252b5485732';
  const hornsSpineId = 'cd7ad222-27cb-4747-a024-b544b352195d';
  const hornsCorsetId = '5357d9c4-e0a7-4324-9562-43a98d301872';
  const fullId = '81abfb43-d889-41cf-a70c-577ef1f51ebf';
  if (![corsetSpineId, hornsSpineId, hornsCorsetId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === corsetSpineId) return {
      ...row,
      public_label: 'Corset + Spine',
      component_code: 'corset_spine',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['corset','spine'],
      bundle_component_labels: ['Corset','Spine'],
      needs_label_review: false,
    };
    if (id === hornsSpineId) return {
      ...row,
      public_label: 'Horns + Spine',
      component_code: 'horns_spine',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['horns','spine'],
      bundle_component_labels: ['Horns','Spine'],
      needs_label_review: false,
    };
    if (id === hornsCorsetId) return {
      ...row,
      public_label: 'Horns + Corset',
      component_code: 'horns_corset',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['horns','corset'],
      bundle_component_labels: ['Horns','Corset'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['corset','spine','horns'],
      bundle_component_labels: ['Corset','Spine','Horns'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch32SilverArmor<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const armId = '3c110b4c-789b-4259-84d2-6b9724dc7ca3';
  if (!product.configurations.some(row => configurationId(row) === armId)) return product;
  const configurations = product.configurations.map(row => (
    configurationId(row) === armId
      ? { ...row, public_label: 'Arm Covers', needs_label_review: false }
      : row
  ));
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch32FemaleWarrior<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = '0a628744-de0b-466a-8345-73d96b1aa411';
  const fullId = '791c60df-1bdf-44ef-b851-70da0b483f34';
  if (![braId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return {
      ...row, public_label: 'Bra', component_code: 'top', component_family: 'Top', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['choker','top','arms','shoulders','belt','legs'],
      bundle_component_labels: ['Choker','Bra','Arm Covers','Shoulders','Belt','Garters'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch32CatCostume<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const topId = 'd721e11e-2a8c-4b14-9911-db477659b69b';
  const fullId = '0d4d3fd4-96c2-4a97-86c1-21238c723c0f';
  if (![topId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === topId) return {
      ...row, public_label: 'Metallic Top', component_code: 'top', component_family: 'Top', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','mask','top'],
      bundle_component_labels: ['Bracelets','Cat Mask','Metallic Top'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch32CorsetSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const necklaceId = '59389c1f-eac0-417a-b795-32c64999d4ea';
  const corsetSkirtId = 'b2c4dde9-1dff-471a-b4fd-8c7584e597dd';
  const fullId = '8055183e-7d31-4ff2-8526-5de87920c9c4';
  if (![necklaceId, corsetSkirtId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === necklaceId) return {
      ...row, public_label: 'Necklace', component_code: 'choker', component_family: 'Neck', needs_label_review: false
    };
    if (id === corsetSkirtId) return {
      ...row,
      public_label: 'Corset + Skirt',
      component_code: 'corset_skirt',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['corset','skirt'],
      bundle_component_labels: ['Corset','Skirt'],
      needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['choker','corset','skirt'],
      bundle_component_labels: ['Necklace','Corset','Skirt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch32GoldArmArmor<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const forearmId = 'f5cf58e2-1faf-47a9-8e01-94dedf29f96e';
  const bicepId = '3dfe2387-06f1-479c-9750-f2cd5946b27c';
  const fullId = '92c052c7-85a6-47db-a4b8-f4e651990122';
  if (![forearmId, bicepId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === forearmId) return {
      ...row, public_label: 'Forearm Bracers', component_code: 'forearm_bracers', component_family: 'Arms', needs_label_review: false
    };
    if (id === bicepId) return {
      ...row, public_label: 'Bicep Armor', component_code: 'bicep_armor', component_family: 'Arms', needs_label_review: false
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['choker','forearm_bracers','shoulders','bicep_armor'],
      bundle_component_labels: ['Choker','Forearm Bracers','Shoulders','Bicep Armor'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch31GoldBraSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = 'bb0a0060-bbea-41af-8271-5d3552996539';
  const fullId = '436d2875-a50e-4c10-b8a4-cc06e17d620d';
  if (![braId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return { ...row, public_label: 'Bra', component_code: 'top', component_family: 'Top', needs_label_review: false };
    if (id === fullId) return { ...row, bundle_component_codes: ['choker','skirt','top'], bundle_component_labels: ['Choker','Skirt','Bra'], source_confirmed_bundle_members: true, needs_label_review: false };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch31SilverCorset<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const legBraceletsId = '61cc3a4e-68c5-49c3-8bc8-8ad821a62d31';
  const fullId = 'c9751d15-d524-4194-a99d-b1bf7fd74f32';
  if (![legBraceletsId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === legBraceletsId) return { ...row, public_label: 'Leg Bracelets', component_code: 'leg_bracelets', component_family: 'Legs', needs_label_review: false };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['legs','leg_bracelets','corset'],
      bundle_component_labels: ['Garters','Leg Bracelets','Corset'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch31Butterfly<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const handId = 'e39a252e-b943-40b7-984f-11645c92d22a';
  const legId = '608e71bb-dfcd-407d-9cd1-b3a51689f984';
  const fullId = '2a88b9d4-efda-4bb1-a567-c42902e170ab';
  if (![handId, legId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === handId) return { ...row, public_label: 'Hand Bracelets', component_code: 'arms', component_family: 'Arms', needs_label_review: false };
    if (id === legId) return { ...row, public_label: 'Leg Bracelets', component_code: 'legs', component_family: 'Legs', needs_label_review: false };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','legs','spine','bodysuit'],
      bundle_component_labels: ['Hand Bracelets','Leg Bracelets','Spine','Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch31GoldHorns<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const chestId = 'ca3cfea5-3c0e-4da8-a0fa-c5e265517816';
  const fullId = 'a2c35e0d-65fc-4906-8096-eb1a4042aba0';
  if (![chestId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === chestId) return { ...row, public_label: 'Chest', component_code: 'top', component_family: 'Top', needs_label_review: false };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top','shoulders','horns','legs'],
      bundle_component_labels: ['Chest','Shoulders','Horns','Leg Covers'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch31GoddessHeadpiece<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const headpieceId = '90665dc5-1860-4f1d-8c02-f10511ff7f0f';
  const fullId = 'ce965e08-8741-442a-a490-ea9a01251148';
  if (![headpieceId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === headpieceId) return { ...row, public_label: 'Headpiece', component_code: 'headpiece', component_family: 'Headpiece', needs_label_review: false };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['headpiece','skirt','top','shoulders'],
      bundle_component_labels: ['Headpiece','Skirt','Top','Shoulders'],
      source_confirmed_bundle_members: true,
      needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch30NecklaceBelt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const necklaceId = '8995c12a-4d56-4fd8-b656-9cec86e108f7';
  const fullId = '1f004691-a2d9-4af9-9d4f-98d44fc361f6';
  if (![necklaceId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === necklaceId) return { ...row, public_label: 'Necklace', component_code: 'choker', component_family: 'Neck', needs_label_review: false };
    if (id === fullId) return { ...row, bundle_component_codes: ['choker','belt'], bundle_component_labels: ['Necklace','Belt'], source_confirmed_bundle_members: true, needs_label_review: false };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch30SilverBeltPanties<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const bundleId = '335deb18-22fe-45b1-99d5-89916a336f52';
  const fullId = 'c93f9e36-0295-4595-8ff0-ab8889f335f5';
  if (![bundleId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === bundleId) return {
      ...row, public_label: 'Belt + Panties', component_code: 'belt_panties',
      component_family: 'Bundle', is_bundle: true, is_full_set: false,
      bundle_component_codes: ['belt','panties'], bundle_component_labels: ['Belt','Panties'], needs_label_review: false
    };
    if (id === fullId) return {
      ...row, bundle_component_codes: ['top','belt','panties'],
      bundle_component_labels: ['Top','Belt','Panties'],
      source_confirmed_bundle_members: true, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch30FullBodyHarness<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const topId = '4f3d2d7a-e230-4180-880b-5f9e7719d25e';
  const fullId = '4a3527f6-9140-4309-b380-5d033a66bc01';
  if (![topId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === topId) return { ...row, public_label: 'Top Harness', component_code: 'harness', component_family: 'Harness', needs_label_review: false };
    if (id === fullId) return { ...row, bundle_component_codes: ['harness','legs'], bundle_component_labels: ['Top Harness','Garters'], source_confirmed_bundle_members: true, needs_label_review: false };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch30HoloWings<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const handId = '0ff29db2-de7e-4c99-8ea0-7911dff6a4a8';
  const legId = '9aa6c030-60d2-431d-91f2-a811d2f6d6cd';
  const fullId = 'b5c06f4a-4de8-4183-9e0a-6c1fb997ca62';
  if (![handId, legId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === handId) return { ...row, public_label: 'Hand Bracelets', component_code: 'arms', component_family: 'Arms', needs_label_review: false };
    if (id === legId) return { ...row, public_label: 'Leg Bracelets', component_code: 'legs', component_family: 'Legs', needs_label_review: false };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms','legs','headpiece','bodysuit','wings'],
      bundle_component_labels: ['Hand Bracelets','Leg Bracelets','Headpiece','Bodysuit','Wings'],
      source_confirmed_bundle_members: true, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch30DesertWarrior<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const hoodId = '2002c029-1cd2-4717-b3d7-744ad1203baf';
  const pantsId = '77b75eaf-5cee-4e17-966f-485a2cced59f';
  const fullId = 'c97fc92a-2ac8-4c99-8fd5-54fba1e1a055';
  if (![hoodId, pantsId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === hoodId) return { ...row, public_label: 'Hood', component_code: 'headpiece', component_family: 'Headpiece', needs_label_review: false };
    if (id === pantsId) return { ...row, public_label: 'Pants', component_code: 'pants', component_family: 'Bottom', needs_label_review: false };
    if (id === fullId) return {
      ...row, bundle_component_codes: ['arms','mask','headpiece','pants'],
      bundle_component_labels: ['Gloves','Mask','Hood','Pants'],
      source_confirmed_bundle_members: true, needs_label_review: false
    };
    return row;
  });
  return { ...product, configurations, needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch29CaptainArmor<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const chestId = 'c7277bb1-350a-466b-9074-07e6ca5aecd8';
  const fullId = '9b1052a5-83d3-40ce-a402-4dba22ee0edb';
  if (![chestId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === chestId) return {
      ...row,
      public_label: 'Chest Armor',
      component_code: 'top',
      component_family: 'Top',
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms', 'belt', 'choker', 'top'],
      bundle_component_labels: ['Bracelets', 'Belt Armor', 'Choker', 'Chest Armor'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch29WhiteMensArmor<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const glovesId = '86121b07-a7c8-4836-bf2b-2c5528ddaca5';
  const shoulderArmId = '3450d3fb-3d5a-4237-9408-04e26bc8372e';
  const fullId = 'b734518a-b6c3-423d-b958-e850f177f16b';
  if (![glovesId, shoulderArmId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === glovesId) return {
      ...row,
      public_label: 'Gloves',
      component_code: 'gloves',
      component_family: 'Arms',
      needs_label_review: false,
    };
    if (id === shoulderArmId) return {
      ...row,
      public_label: 'Shoulder + Arm',
      component_code: 'shoulder_arm',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['shoulders', 'arms'],
      bundle_component_labels: ['Shoulder', 'Arm'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['gloves', 'shoulders', 'arms', 'panties', 'legs'],
      bundle_component_labels: ['Gloves', 'Shoulder', 'Arm', 'Panties', 'Leg Covers'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch29PlagueDoctor<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const maskId = '44f68b45-228f-4a68-bbf9-dc0651c3376d';
  const collarId = '503f6911-329b-462e-aff6-5285f4800c09';
  const skirtId = '5bd65d9b-4a5c-4ccc-8b2b-7c2f86bc6c14';
  const collarSkirtId = '13e9270d-ee80-4d75-bf19-0e615e41106c';
  const fullId = '7ce46a04-57e2-4dc1-8437-663b025fe216';
  if (![maskId, collarId, skirtId, collarSkirtId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === collarSkirtId) return {
      ...row,
      public_label: 'Collar + Skirt',
      component_code: 'collar_skirt',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['collar', 'skirt'],
      bundle_component_labels: ['Collar', 'Skirt'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['mask', 'collar', 'skirt'],
      bundle_component_labels: ['Mask', 'Collar', 'Skirt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch29RedDragon<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const spineTailId = '30497b10-c3af-48ab-9cc7-c93ecb7abc74';
  const fullId = '89aa265a-8c2e-4e25-a56f-ec72b4f39644';
  if (![spineTailId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === spineTailId) return {
      ...row,
      public_label: 'Spine + Tail',
      component_code: 'spine_tail',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['spine', 'tail'],
      bundle_component_labels: ['Spine', 'Tail'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms', 'shoulders', 'spine', 'tail', 'bodysuit'],
      bundle_component_labels: ['Gloves', 'Shoulders', 'Spine', 'Tail', 'Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch28MensChestHarness<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const options = {
    'dc3b0fea-fc8e-4154-852e-dbdbcc3f6fbf': {
      public_label: 'Vegan Leather Harness',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_material: 'Vegan Leather',
      sort_order: 1,
    },
    'ee10b92e-397e-41a9-931e-0b398f840591': {
      public_label: 'Natural Leather Harness',
      component_code: 'harness',
      component_family: 'Harness',
      configuration_material: 'Natural Leather',
      sort_order: 2,
    },
  };
  if (!Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const correction = options[configurationId(row)];
    return correction ? { ...row, ...correction, needs_label_review: false } : row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch28WomensHarnessSet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const harnessId = '5909c2fb-f536-48e8-a576-b02a2d26f510';
  const gartersId = 'fb7391f0-1a05-4229-8f8f-a6d2c476e5c7';
  const fullId = '02c3b18e-eb67-4bb4-aa1a-b4201f8da9c2';
  if (![harnessId, gartersId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === harnessId) return {
      ...row, public_label: 'Harness', component_code: 'harness',
      component_family: 'Harness', needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['harness', 'legs'],
      bundle_component_labels: ['Harness', 'Garters'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch28SilverBraPantySet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const topId = '5c1081e5-b25b-4fec-9f97-229cdacd46e1';
  const pantiesId = '613184e3-0f00-43ec-8c83-12d97a8b93d1';
  const fullId = '8515103f-a153-44c9-a19a-5f4ce76488e2';
  if (![topId, pantiesId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === topId) return {
      ...row, public_label: 'Top Bra', component_code: 'top',
      component_family: 'Top', needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top', 'panties'],
      bundle_component_labels: ['Top Bra', 'Panties'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch28RedCorsetSkirt<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const chokerId = '94c75b43-867a-492b-bc03-bb11ef04807e';
  const corsetSkirtId = '5925744d-4f17-4c73-b0b8-062f2c702b0d';
  const fullId = 'bc5d078e-6a54-4270-9f17-52c0b55a3dd8';
  if (![chokerId, corsetSkirtId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === corsetSkirtId) return {
      ...row,
      public_label: 'Corset + Skirt',
      component_code: 'corset_skirt',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['corset', 'skirt'],
      bundle_component_labels: ['Corset', 'Skirt'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['choker', 'corset', 'skirt'],
      bundle_component_labels: ['Choker', 'Corset', 'Skirt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctBatch28GoldSpineTail<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const spineTailId = '2499f3fb-056f-4d21-bab5-27dad44f9906';
  const fullId = 'bdf66ecc-1c4b-4b40-ba3d-bebcbc230a4f';
  if (![spineTailId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === spineTailId) return {
      ...row,
      public_label: 'Spine + Tail',
      component_code: 'spine_tail',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['spine', 'tail'],
      bundle_component_labels: ['Spine', 'Tail'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['spine', 'tail', 'belt', 'legs', 'top', 'shoulders'],
      bundle_component_labels: ['Spine', 'Tail', 'Belt', 'Garters', 'Top', 'Shoulders'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return { ...product, configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true) };
}

function correctPinkRaveBodysuitSet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const sleevesLegsId = '099731eb-a253-4bdc-81a5-28f8295d93d3';
  const shouldersId = '2d7ae103-2aec-4113-9fe1-e6282f3f3a32';
  const bodysuitId = '49312166-a743-45e9-acee-20919b8f6759';
  const fullId = 'b23fa19a-fab6-42c7-95e5-c5056f274fae';
  if (![sleevesLegsId, shouldersId, bodysuitId, fullId].every(
    id => product.configurations.some(row => configurationId(row) === id),
  )) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === sleevesLegsId) return {
      ...row,
      public_label: 'Sleeves + Leg Covers',
      component_code: 'sleeves_leg_covers',
      component_family: 'Bundle',
      is_bundle: true,
      is_full_set: false,
      bundle_component_codes: ['arms', 'legs'],
      bundle_component_labels: ['Sleeves', 'Leg Covers'],
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['arms', 'legs', 'shoulders', 'bodysuit'],
      bundle_component_labels: ['Sleeves', 'Leg Covers', 'Shoulders', 'Bodysuit'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  return {
    ...product,
    configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true),
  };
}

function correctSilverRobotArmQuantities<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const options = {
    '098a025b-5437-460f-b640-3e57b94e7619': {
      public_label: 'Single Arm Piece',
      component_code: 'arms',
      component_family: 'Arms',
      sort_order: 1,
    },
    'fca12d8b-7be7-49ac-a35b-ca41f6bc0d79': {
      public_label: 'Pair of Arm Pieces',
      component_code: 'arms',
      component_family: 'Arms',
      sort_order: 2,
    },
  };
  if (!Object.keys(options).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => options[configurationId(row)]
    ? { ...row, ...options[configurationId(row)], needs_label_review: false }
    : row);
  return {
    ...product,
    configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true),
  };
}

function correctSilverBraSkirtSet<T extends Record<string, any>>(product: T): T {
  if (!Array.isArray(product.configurations)) return product;
  const braId = '1a2bcbf2-8354-43c8-92b8-c4a4c09274e7';
  const skirtId = 'ba7b364f-1b1e-4432-aa87-30287071087e';
  const fullId = '87538880-4abc-4dbb-9be7-8f600d612b2a';
  if (![braId, skirtId, fullId].every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  const configurations = product.configurations.map(row => {
    const id = configurationId(row);
    if (id === braId) return {
      ...row,
      public_label: 'Bra',
      component_code: 'top',
      component_family: 'Top',
      needs_label_review: false,
    };
    if (id === fullId) return {
      ...row,
      bundle_component_codes: ['top', 'skirt'],
      bundle_component_labels: ['Bra', 'Skirt'],
      source_confirmed_bundle_members: true,
      needs_label_review: false,
    };
    return row;
  });
  const bra = configurations.find(row => configurationId(row) === braId);
  const skirt = configurations.find(row => configurationId(row) === skirtId);
  const full = configurations.find(row => configurationId(row) === fullId);
  const componentSum = (numeric(bra?.display_price_amount) || 0) + (numeric(skirt?.display_price_amount) || 0);
  const fullPrice = numeric(full?.display_price_amount);
  const savings = fullPrice != null && componentSum > fullPrice ? componentSum - fullPrice : null;
  return {
    ...product,
    configurations,
    needs_label_review: configurations.some(row => row.needs_label_review === true),
    component_sum_display_price_amount: componentSum || product.component_sum_display_price_amount,
    full_set_savings_amount: savings,
    full_set_savings_percent: savings != null && componentSum > 0
      ? Math.round((savings / componentSum) * 10000) / 100
      : null,
  };
}

export function applyOwnerReviewedStorefrontCorrections<T extends Record<string, any>>(product: T): T {
  const productId = String(product?.canonical_product_id || '');
  if (productId === FINAL_GOLD_ARMOR_VARIANTS_ID) return correctFinalGoldArmorVariants(product);
  if (productId === BATCH39_WHITE_ROBOT_QTY_ID) return correctBatch39WhiteRobotQty(product);
  if (productId === BATCH38_GOLD_HORNS_ID) return correctBatch38GoldHorns(product);
  if (productId === BATCH38_COUPLE_GOLD_ID) return correctBatch38CoupleGold(product);
  if (productId === BATCH38_COUPLE_ALT_ID) return correctBatch38CoupleAlt(product);
  if (productId === BATCH38_WARRIOR_PRINCESS_ID) return correctBatch38WarriorPrincess(product);
  if (productId === BATCH37_WINGS_ID) return correctBatch37Wings(product);
  if (productId === BATCH37_GOLD_BRA_SKIRT_ID) return correctBatch37GoldBraSkirt(product);
  if (productId === BATCH37_COUPLE_ID) return correctBatch37Couple(product);
  if (productId === BATCH37_SUSPENDERS_ID) return correctBatch37Suspenders(product);
  if (productId === BATCH37_DARK_WITCH_ID) return correctBatch37DarkWitch(product);
  if (productId === BATCH36_DANCE_SPINE_TAIL_ID) return correctBatch36DanceSpineTail(product);
  if (productId === BATCH36_SILVER_CORSET_LEGS_ID) return correctBatch36SilverCorsetLegs(product);
  if (productId === BATCH36_WARRIOR_PRINCESS_ID) return correctBatch36WarriorPrincess(product);
  if (productId === BATCH36_ANGEL_ARMOR_QTY_ID) return correctBatch36AngelArmorQty(product);
  if (productId === BATCH36_SILVER_SPINE_ID) return correctBatch36SilverSpine(product);
  if (productId === BATCH35_SILVER_ROBOT_ID) return correctBatch35SilverRobot(product);
  if (productId === BATCH35_COUPLE_PAIRED_ID) return correctBatch35CouplePaired(product);
  if (productId === BATCH35_SILVER_DANCE_ID) return correctBatch35SilverDance(product);
  if (productId === BATCH35_DESERT_GODDESS_ID) return correctBatch35DesertGoddess(product);
  if (productId === BATCH35_SILVER_ARMOR_COMBOS_ID) return correctBatch35SilverArmorCombos(product);
  if (productId === BATCH34_SILVER_BRA_SKIRT_ID) return correctBatch34SilverBraSkirt(product);
  if (productId === BATCH34_COUPLE_OUTFITS_ID) return correctBatch34CoupleOutfits(product);
  if (productId === BATCH34_HOLO_WINGS_ID) return correctBatch34HoloWings(product);
  if (productId === BATCH34_PINK_BODYSUIT_ID) return correctBatch34PinkBodysuit(product);
  if (productId === BATCH34_GOLD_HORNS_ID) return correctBatch34GoldHorns(product);
  if (productId === BATCH33_GOGO_ID) return correctBatch33GoGo(product);
  if (productId === BATCH33_GOLD_TOP_SKIRT_ID) return correctBatch33GoldTopSkirt(product);
  if (productId === BATCH33_BLACK_PUNK_ID) return correctBatch33BlackPunk(product);
  if (productId === BATCH33_MENS_SUSPENDERS_ID) return correctBatch33MensSuspenders(product);
  if (productId === BATCH33_DARK_WITCH_ID) return correctBatch33DarkWitch(product);
  if (productId === BATCH32_SILVER_ARMOR_ID) return correctBatch32SilverArmor(product);
  if (productId === BATCH32_FEMALE_WARRIOR_ID) return correctBatch32FemaleWarrior(product);
  if (productId === BATCH32_CAT_COSTUME_ID) return correctBatch32CatCostume(product);
  if (productId === BATCH32_CORSET_SKIRT_ID) return correctBatch32CorsetSkirt(product);
  if (productId === BATCH32_GOLD_ARM_ARMOR_ID) return correctBatch32GoldArmArmor(product);
  if (productId === BATCH31_GOLD_BRA_SKIRT_ID) return correctBatch31GoldBraSkirt(product);
  if (productId === BATCH31_SILVER_CORSET_ID) return correctBatch31SilverCorset(product);
  if (productId === BATCH31_BUTTERFLY_ID) return correctBatch31Butterfly(product);
  if (productId === BATCH31_GOLD_HORNS_ID) return correctBatch31GoldHorns(product);
  if (productId === BATCH31_GODDESS_HEADPIECE_ID) return correctBatch31GoddessHeadpiece(product);
  if (productId === BATCH30_NECKLACE_BELT_ID) return correctBatch30NecklaceBelt(product);
  if (productId === BATCH30_SILVER_BELT_PANTIES_ID) return correctBatch30SilverBeltPanties(product);
  if (productId === BATCH30_FULL_BODY_HARNESS_ID) return correctBatch30FullBodyHarness(product);
  if (productId === BATCH30_HOLO_WINGS_ID) return correctBatch30HoloWings(product);
  if (productId === BATCH30_DESERT_WARRIOR_ID) return correctBatch30DesertWarrior(product);
  if (productId === BATCH29_CAPTAIN_ARMOR_ID) return correctBatch29CaptainArmor(product);
  if (productId === BATCH29_WHITE_MENS_ARMOR_ID) return correctBatch29WhiteMensArmor(product);
  if (productId === BATCH29_PLAGUE_DOCTOR_ID) return correctBatch29PlagueDoctor(product);
  if (productId === BATCH29_RED_DRAGON_ID) return correctBatch29RedDragon(product);
  if (productId === BATCH28_MENS_CHEST_HARNESS_ID) return correctBatch28MensChestHarness(product);
  if (productId === BATCH28_WOMENS_HARNESS_SET_ID) return correctBatch28WomensHarnessSet(product);
  if (productId === BATCH28_SILVER_BRA_PANTY_ID) return correctBatch28SilverBraPantySet(product);
  if (productId === BATCH28_RED_CORSET_SKIRT_ID) return correctBatch28RedCorsetSkirt(product);
  if (productId === BATCH28_GOLD_SPINE_TAIL_ID) return correctBatch28GoldSpineTail(product);
  if (productId === PINK_RAVE_BODYSUIT_ID) {
    return correctPinkRaveBodysuitSet(product);
  }
  if (String(product?.canonical_product_id || '') === SILVER_ROBOT_ARMS_ID) {
    return correctSilverRobotArmQuantities(product);
  }
  if (String(product?.canonical_product_id || '') === SILVER_BRA_SKIRT_SET_ID) {
    return correctSilverBraSkirtSet(product);
  }
  if (BATCH10_REVIEWED_GROUPS[String(product?.canonical_product_id || '')]) {
    return correctBatch10GroupedOptions(product);
  }
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

// Source descriptions and variant labels agree for these two Batch10 sets.
// Distinct groups need distinct codes: a shared "bundle" code makes option
// selection/signatures confuse Bra + Shoulders with Belt + Garters.
const BATCH10_REVIEWED_GROUPS = {
  'f96bb86c-43aa-49c1-a718-41fbe050a1ac': {
    '352f29c3-1bd3-4867-8fb0-69c741d011c9': { code: 'top_shoulders', codes: ['top', 'shoulders'], labels: ['Top', 'Shoulders'] },
    '6f078b00-3fbe-4815-be73-d9911a997b7a': { code: 'belt_garters', codes: ['belt', 'legs'], labels: ['Belt', 'Garters'] },
    'e84c5af8-af09-47e5-a048-22b2590186b3': { code: 'full_set', codes: ['choker', 'top', 'shoulders', 'belt', 'legs'], labels: ['Choker', 'Top', 'Shoulders', 'Belt', 'Garters'] },
  },
  '6a885710-fbee-4790-ba09-d56530f641f6': {
    '58a5e3b8-6656-4571-b39f-a509416f34fc': { code: 'top_shoulders', codes: ['top', 'shoulders'], labels: ['Top', 'Shoulders'] },
    '3ca222c0-06d3-4fca-9c74-8c2c07d627fb': { code: 'belt_garters', codes: ['belt', 'legs'], labels: ['Belt', 'Garters'] },
    '5723b1c6-0a4b-4a8b-ab6b-25ebf6313544': { code: 'full_set', codes: ['spine', 'top', 'shoulders', 'belt', 'legs'], labels: ['Spine', 'Top', 'Shoulders', 'Belt', 'Garters'] },
  },
};

function correctBatch10GroupedOptions<T extends Record<string, any>>(product: T): T {
  const groups = BATCH10_REVIEWED_GROUPS[String(product.canonical_product_id)];
  if (!Array.isArray(product.configurations)
    || !Object.keys(groups).every(id => product.configurations.some(row => configurationId(row) === id))) return product;
  return { ...product, configurations: product.configurations.map(row => {
    const group = groups[configurationId(row)];
    return group ? { ...row, component_code: group.code,
      bundle_component_codes: group.codes, bundle_component_labels: group.labels } : row;
  }) };
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
