import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { compilePurchaseBindingEvidence, inspectPurchaseSelection, type ProductScope } from '../lib/purchaseBindingEvidence.ts';
import { sortedOptions, optionKey } from '../lib/storefront.ts';
import { resolveStorefrontSellableOffer } from '../lib/storefrontSellableOffer.ts';
import type { StorefrontProduct } from '../lib/types.ts';

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const paths = ['docs/search/purchase-binding-capture-20260924.json', 'docs/search/purchase-binding-view-definitions-20260924.json',
  'docs/search/inventory-capture-20260924.json', 'docs/search/inventory-reconciliation-capture-20260924.json', 'docs/search/inventory-reconciliation-report-20260924.json',
  'docs/search/purchase-binding-import-provenance-20260924.json', 'docs/search/purchase-binding-original-file-audit-20260924.json'];
const texts = paths.map(p => readFileSync(p, 'utf8'));
const [capture, viewDefinitions, catalog, sources, reconciliation] = texts.map(s => JSON.parse(s));
const originalFileAudit = JSON.parse(texts[6]);
assert.equal(originalFileAudit.source_capture_sha256, sha(texts[0]));
assert.equal(originalFileAudit.all_scoped_payloads_identical, true);
assert.equal(new Set(originalFileAudit.matches.map((m: { source_price_row_id: string }) => m.source_price_row_id)).size, capture.source_prices.length);
type Source = { canonical_product_id: string; source_listing_id: string; source_variations_json: { raw_variation_name: string; values: string[] }[] };
const scoped: Source[] = sources.products.filter((s: Source) => capture.scope_product_ids.includes(s.canonical_product_id));
const heldIds = reconciliation.cases.filter((c: { offer_status: string }) => c.offer_status === 'hold').map((c: { canonical_product_id: string }) => c.canonical_product_id);
// A later composition confirmation does not resolve the full size/color price tuple.
// Preserve the original evidence scope rather than dropping price rows when composition resolves.
assert.ok(heldIds.every((id: string) => capture.scope_product_ids.includes(id)));
assert.equal(scoped.length, capture.scope_product_ids.length);
const scopes: ProductScope[] = scoped.map(s => ({ canonical_product_id: s.canonical_product_id, source_listing_id: s.source_listing_id,
  declared_sizes: s.source_variations_json.filter(a => /^(?:Size|Unisex shirt size)$/i.test(a.raw_variation_name)).flatMap(a => a.values),
  declared_colors: s.source_variations_json.filter(a => /^(?:Primary color|Color|Colour)$/i.test(a.raw_variation_name)).flatMap(a => a.values),
}));
const proposal = compilePurchaseBindingEvidence(capture, scopes);
const schema = viewDefinitions.views.find((v: { viewname: string }) => v.viewname === 'feya_commerce_v_step7_storefront_products_api_v4').definition;
assert.ok(schema.includes("'configuration_id', (ranked_options.configuration_price_id)::text"));
const products: StorefrontProduct[] = catalog.products;
const currentSurface = scopes.map(s => {
  const p = products.find(p => p.canonical_product_id === s.canonical_product_id)!;
  const compositionStatus = resolveStorefrontSellableOffer(p).status;
  const configurations = p.configurations as { configuration_id: string; display_price_amount: number; currency: string }[];
  const owned = capture.prices.filter((r: { canonical_product_id: string }) => r.canonical_product_id === s.canonical_product_id);
  assert.deepEqual(configurations.map(c => c.configuration_id).sort(), owned.map((r: { configuration_price_id: string }) => r.configuration_price_id).sort());
  for (const row of owned) {
    const c = configurations.find(c => c.configuration_id === row.configuration_price_id)!;
    assert.equal(c.display_price_amount, Number(row.public_price_amount));
    assert.equal(c.currency, row.source_currency);
  }
  const shown = sortedOptions(p).map(optionKey);
  return { canonical_product_id: s.canonical_product_id, url_path: '/shop/' + p.product_slug,
    admin_product_path: '/admin/products/' + p.product_slug, source_configuration_price_count: configurations.length,
    current_visible_option_count: shown.length, current_visible_configuration_ids: shown,
    configuration_ids_collapsed_by_label: configurations.map(c => c.configuration_id).filter(id => !shown.includes(id)),
    observation: 'Offline replay of current sortedOptions; equal display labels retain the highest-priced row. Not a live browser crawl.',
    offer_status: compositionStatus, can_publish: false };
});
const classify = (kind: string) => proposal.rows.filter(r => r.price_observation.kind === kind).length;
const pdpSource = readFileSync('components/ProductDetailClient.tsx', 'utf8');
const sizeButtons = pdpSource.match(/const SIZES = (\[[^\n]+\]);/)?.[1];
const report = {
  contract_version: 'purchase_binding_audit_v1', captured_on: capture.captured_on, baseline_commit: capture.baseline_commit,
  source_fingerprints: paths.map((path, i) => ({ path, sha256: sha(texts[i]) })),
  implementation: ['lib/purchaseBindingEvidence.ts', 'scripts/audit-purchase-bindings.ts', 'lib/storefront.ts', 'components/ProductDetailClient.tsx']
    .map(path => ({ path, sha256: sha(readFileSync(path, 'utf8')) })),
  summary: { products: scopes.length, preserved_configuration_price_ids: proposal.rows.length,
    source_price_rows: capture.source_prices.length, mappings: capture.mappings.length, legacy_configuration_parents: capture.configurations.length,
    size_observations: proposal.rows.filter(r => r.axis === 'size').length, purchase_option_observations: proposal.rows.filter(r => r.axis === 'configuration').length,
    exact_single_axis_price_observations: classify('exact_observation'), range_observations: classify('range_observation'), unresolved_price_expressions: classify('unresolved'),
    shared_configuration_parents: proposal.configuration_parent_collisions.length,
    rows_pointing_to_parent_with_different_mapping: proposal.rows.filter(r => r.blockers.includes('configuration_parent_points_to_different_mapping')).length,
    hidden_by_current_label_deduplication: currentSurface.reduce((n, p) => n + p.configuration_ids_collapsed_by_label.length, 0),
    declared_size_values_without_price_rows: proposal.coverage.reduce((n, p) => n + p.declared_sizes_without_price_rows.length, 0),
    newly_orderable_products: 0, generated_variant_combinations: 0, prices_changed: 0, approvals_changed: 0 },
  identity_contract: { storefront_configuration_id: 'configuration_price_id (observed SQL v4 alias)',
    sellable_configuration_id: 'Legacy grouping parent; not interchangeable with the per-price selector ID',
    proposal_key: 'Existing product + configuration_price IDs; no new DB identifiers allocated',
    price_scope: 'Exact single-axis observation or range; neither proves the price/availability of a complete piece-size-color tuple' },
  proposal, current_storefront_surface: currentSurface,
  selector_rehearsals: [
    { canonical_product_id: '0cd7c558-7344-4076-91a5-86f7f5fe0ad0', size: 'M', color: 'Gold', configuration_price_id: '4f81a685-d6e9-4a44-b310-7c8a04f28e21' },
    { canonical_product_id: '0cd7c558-7344-4076-91a5-86f7f5fe0ad0', size: '4X', color: 'Gold' },
    { canonical_product_id: '1ce50e76-c066-46b8-97ba-d6be92a593ff', size: '1X', color: 'White' },
    { canonical_product_id: '2dddffcc-dd07-4d94-a4df-0217aac4f815', size: 'M', configuration_price_id: 'ae4841a5-dcaf-47e2-a2fd-0a44684df95e' },
  ].map(s => inspectPurchaseSelection(proposal, s)),
  ui_dependency: { fixed_size_buttons: sizeButtons ? JSON.parse(sizeButtons.replace(/'/g, '"')) : null,
    default_size: pdpSource.match(/const \[size, setSize\] = useState\('([^']+)'\)/)?.[1] || null,
    current_size_change_updates_configuration_price: pdpSource.includes('onClick={() => setSize(s)}') ? false : null,
    finding: 'Static code inspection: size state is independent of selected configuration and price. Final adapter must bind existing controls to approved tuple evidence without redesign.',
    activation_requires: ['current complete selection evidence', 'approved physical purchase scope', 'unchanged price identities and display values', 'owner UI contract verification', 'server-side price validation before checkout'] },
  owner_history_search: 'No exact listing-scoped owner confirmations for the inspected acrylic/jacket IDs were retrieved. This is not proof that no prior decision exists; no general rule or neighboring product was substituted.',
  original_file_verification: { library_file_id: originalFileAudit.library_file_id, sha256: originalFileAudit.original_sha256,
    original_price_row_count: originalFileAudit.original_price_row_count, scoped_rows: originalFileAudit.scoped_price_row_count,
    all_scoped_payloads_identical: true, complete_variant_matrix_present: false },
  production_writes: 0, runtime_adapter_connected: false, can_apply: false, can_publish: false, can_index: false,
};
const output = JSON.stringify(report, null, 2) + '\n';
const path = 'docs/search/purchase-binding-report-20260924.json';
if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8'), output, 'Binding report must be regenerated and reviewed');
else writeFileSync(path, output);
console.log(JSON.stringify(report.summary));
