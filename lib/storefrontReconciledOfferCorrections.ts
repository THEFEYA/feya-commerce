/** Exact-ID reconciliation, 2026-09-24. Sources and source-price joins are
 * captured in docs/search/inventory-reconciliation-capture-20260924.json.
 * Only display/composition fields are patched. No price, identity or approval
 * field is writable through this manifest. Historical drafts remain intact. */
type Patch = {
  public_label: string; component_code: string; component_family: string;
  is_bundle: boolean; is_full_set: boolean; needs_label_review: false;
  bundle_component_codes: string[]; bundle_component_labels: string[];
  bundle_component_axis_labels?: string[];
  source_confirmed_bundle_members?: boolean; configuration_color?: string;
  sort_order?: number;
};
const atomic = (label: string, code: string, family: string): Patch => ({
  public_label: label, component_code: code, component_family: family,
  is_bundle: false, is_full_set: false, needs_label_review: false,
  bundle_component_codes: [], bundle_component_labels: [],
});
const group = (label: string, code: string, codes: string[], labels: string[], full = false, axes?: string[]): Patch => ({
  ...atomic(label, code, 'Bundle'), is_bundle: true, is_full_set: full,
  bundle_component_codes: codes, bundle_component_labels: labels,
  source_confirmed_bundle_members: true,
  ...(axes ? { bundle_component_axis_labels: axes } : {}),
});
type Correction = { evidence_refs: string[]; options: Record<string, Patch>; preferred_color?: string };
export const RECONCILED_OFFER_CORRECTIONS: Readonly<Record<string, Correction>> = {
  '40384eea-fd82-40f4-98e7-804383c42796': {
    // Owner batch 1 answer: bra + skirt. No belt, fabric garments or price tuple inferred.
    evidence_refs: ['owner_decision:owner-launch-scope-20260924-02:bra_skirt', 'source_listing:1901540523'],
    options: {
      'a415b1cc-1001-4c8b-b03e-7ed6a27f7ad6': atomic('Bra', 'top', 'Top'),
      'ebf42918-4916-46c1-b2a9-75a8e2fe4ae0': atomic('Skirt', 'skirt', 'Bottom'),
      '40b8d2ce-8267-42b8-a4a3-f6a7ea24f212': group('Full Set', 'full_set', ['top', 'skirt'], ['Bra', 'Skirt'], true),
    },
  },
  '4b0c8180-774d-4d5c-a12c-0864f305d1cb': {
    evidence_refs: ['seo_draft:ab0bc6b6-0cc9-4a45-a4fd-45df32d87c42:approved', 'source_listing:4487639486'],
    options: {
      'bb5ae6b4-824d-45cf-a1ac-8e2a26111242': atomic('Bracelet', 'arms', 'Arms'),
      '22aacfc5-7ffa-4a7e-800e-448ba0ec88dc': atomic('Skirt', 'skirt', 'Bottom'),
      'e0b68b79-a4a1-4b9e-a33e-8240777a52bc': group('Top + Shoulders', 'bundle', ['shoulders', 'top'], ['Shoulders', 'Top']),
      'aa40d23b-7bcf-4a59-ab91-7e1fca94fab8': group('Full Set', 'full_set', ['arms', 'shoulders', 'skirt', 'top'], ['Bracelet', 'Shoulders', 'Skirt', 'Top'], true),
    },
  },
  '98600aa8-307b-4165-a8ae-38e347c114bd': {
    evidence_refs: ['seo_draft:83ed5c0f-e191-45d2-b13a-424f50952a80:approved', 'source_listing:1882682017'],
    options: {
      '44f68b45-228f-4a68-bbf9-dc0651c3376d': atomic('Mask', 'mask', 'Headpiece'),
      '503f6911-329b-462e-aff6-5285f4800c09': atomic('Collar', 'collar', 'Neck'),
      '5bd65d9b-4a5c-4ccc-8b2b-7c2f86bc6c14': atomic('Skirt Only', 'skirt', 'Bottom'),
      '13e9270d-ee80-4d75-bf19-0e615e41106c': group('Collar + Skirt', 'collar_skirt', ['collar', 'skirt'], ['Collar', 'Skirt']),
      '7ce46a04-57e2-4dc1-8437-663b025fe216': group('Full Set', 'full_set', ['mask', 'collar', 'skirt'], ['Mask', 'Collar', 'Skirt'], true),
    },
  },
  '9d6047ad-406d-4279-a10b-2918e111d587': {
    evidence_refs: ['seo_draft:557634fa-e0c4-4895-b999-bc9f038334d5:approved', 'source_listing:1779245327'],
    options: {
      '99e81c83-417f-4ac4-9c50-de4ae8d7f549': atomic('Forearm Covers', 'arms', 'Arms'),
      '5e94fece-df7d-458d-b2ed-ac0006092af1': atomic('Tail', 'tail', 'Back'),
      '2131f965-586f-4d03-874f-a23d34f14318': atomic('Bodysuit', 'bodysuit', 'Bodysuit'),
      '6d558d91-230a-4ce8-83a6-fc69885cf6f7': group('Full Set', 'full_set', ['arms', 'tail', 'bodysuit'], ['Forearm Covers', 'Tail', 'Bodysuit'], true),
    },
  },
  'e39f9164-4001-4f63-9407-a1ddd3d962dd': {
    evidence_refs: ['seo_draft:843e2b31-62fd-4a02-b17b-4424bd768027:approved', 'source_listing:1792447742'],
    options: {
      '5b906cbb-7473-415f-90e2-57c172d5a2ee': atomic('Single Leg Cover', 'legs', 'Legs'),
      '7c286f97-754a-41de-89a5-83dee62f5ee2': atomic('Bodysuit', 'bodysuit', 'Bodysuit'),
      'd0bb5eb6-840b-4a94-9ef3-4ba3ccb786c6': atomic('Pair of Leg Covers', 'legs', 'Legs'),
      'd33b481a-d6a9-4b95-8f89-97a1b290503a': group('Full Set — 1 Leg Cover', 'full_set', ['legs', 'bodysuit'], ['Single Leg Cover', 'Bodysuit'], true, ['Leg Covers', 'Bodysuit']),
      'e7741b64-c7a1-46aa-ba91-d5376d45baba': group('Full Set — 2 Leg Covers', 'full_set', ['legs', 'bodysuit'], ['Pair of Leg Covers', 'Bodysuit'], true, ['Leg Covers', 'Bodysuit']),
    },
  },
  'ce0a2c0a-5a95-4876-a198-70be635ca053': {
    // This is product-scoped owner truth, not approval of the SEO draft.
    evidence_refs: ['seo_draft:4de86fde-81af-4ccf-9ca1-258b967adb25:owner_identity_note', 'source_listing:1871319427'],
    preferred_color: 'Green',
    options: {
      '9be27162-64f5-4e88-a568-b3f8511edd32': { ...atomic('Harness', 'harness', 'Harness'), configuration_color: 'Black', sort_order: 2 },
      'c47c5fa4-5739-492e-9767-9a8b5c0b0c27': { ...atomic('Harness', 'harness', 'Harness'), configuration_color: 'Green', sort_order: 1 },
      'd5cfc179-9ccc-477c-9031-998ab103bcb3': { ...atomic('Harness', 'harness', 'Harness'), configuration_color: 'Brown', sort_order: 3 },
    },
  },
  '437a20cd-27a3-4aaf-b154-3353899e0ebd': {
    evidence_refs: ['seo_draft:ecf6d94b-4d66-4472-98a5-da577a22a45a:owner_variant_guide', 'source_listing:1902238173'],
    options: {
      '899e0b93-6222-4208-9d3a-218e4747b982': group('Variant #1', 'variant_1', ['shoulders', 'harness', 'legs', 'arms'], ['1 Shoulder', 'Harness', 'Garters', '2 Bracelets'], false, ['Shoulders', 'Harness', 'Garters', 'Bracelets']),
      'a737ac7d-bff8-4325-b101-fa934bb1d322': group('Variant #2', 'variant_2', ['shoulders', 'harness', 'legs', 'arms'], ['2 Shoulders', 'Harness', 'Garters', '2 Bracelets'], false, ['Shoulders', 'Harness', 'Garters', 'Bracelets']),
      '3ae4183d-f178-4231-a551-5c874520a25a': group('Variant #3', 'variant_3', ['harness', 'legs', 'arms'], ['Harness', 'Garters', '2 Bracelets'], false, ['Harness', 'Garters', 'Bracelets']),
      'dce0b722-5c5b-4b2b-81c4-032c1d295a53': group('Variant #4', 'variant_4', ['shoulders', 'legs', 'arms'], ['1 Shoulder', 'Garters', '1 Bracelet'], false, ['Shoulders', 'Garters', 'Bracelets']),
    },
  },
};

export function applyReconciledOfferCorrections<T extends Record<string, unknown>>(product: T): T {
  const correction = RECONCILED_OFFER_CORRECTIONS[String(product.canonical_product_id || '')];
  if (!correction || !Array.isArray(product.configurations)) return product;
  const rows = product.configurations as Record<string, unknown>[];
  const id = (r: Record<string, unknown>) => String(r.configuration_id || r.configuration_price_id || '');
  const expected = Object.keys(correction.options);
  // An extra, missing or duplicated choice changes the reviewed purchase scope.
  if (rows.length !== expected.length || new Set(rows.map(id)).size !== expected.length || rows.some(r => !expected.includes(id(r)))) return product;
  const configurations = rows.map(r => ({ ...r, ...correction.options[id(r)] }));
  return { ...product, configurations, needs_label_review: false,
    ...(correction.preferred_color ? {
      canonical_color_label: correction.preferred_color,
      color_options: [...configurations].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map(r => r.configuration_color),
    } : {}),
  };
}
