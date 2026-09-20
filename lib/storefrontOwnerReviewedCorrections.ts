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
