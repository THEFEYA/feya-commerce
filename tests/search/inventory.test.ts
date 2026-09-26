import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { selectInventoryProduct, selectInventory, isInventoryRule, type InventoryInput, type InventoryRule } from '../../lib/searchInventorySelection.ts';

const shoulder: InventoryRule = { kind: 'sellable_component', codes: ['shoulders'], scope: 'standalone' };
const event: InventoryRule = { kind: 'confirmed_axis', axis: 'event', value: 'burning_man' };
const input = (): InventoryInput => ({ canonical_product_id: 'fixture-product', snapshot_ref: 'fixture-snapshot', attestations: [],
  storefront: { canonical_product_id: 'fixture-product', storefront_candidate_flag: true, do_not_publish_flag: false,
    configurations: [{ configuration_id: 'fixture-option', component_code: 'shoulders', component_family: 'Shoulders', public_label: 'Shoulders', is_bundle: false }] } });

test('a sellable selection keeps exact IDs without granting release or modifying input', () => {
  const p = input(), before = JSON.stringify(p), r = selectInventoryProduct(p, shoulder);
  assert.equal(r.state, 'match'); assert.deepEqual(r.configuration_ids, ['fixture-option']);
  assert.equal(r.can_publish, false); assert.equal(r.can_index, false); assert.equal(JSON.stringify(p), before);
});
test('included group members do not become standalone purchasable options', () => {
  const p = input(); p.storefront.configurations = [{ configuration_id: 'fixture-group', component_code: 'top_shoulders', component_family: 'Bundle',
    public_label: 'Top + Shoulders', is_bundle: true, bundle_component_codes: ['top', 'shoulders'], bundle_component_labels: ['Top', 'Shoulders'] }];
  const r = selectInventoryProduct(p, shoulder);
  assert.equal(r.state, 'no_match'); assert.ok(r.reason_codes.includes('component_only_in_grouped_configuration'));
  assert.deepEqual(selectInventoryProduct(p, { ...shoulder, scope: 'any_configuration' }).configuration_ids, ['fixture-group']);
});
test('titles, world labels, mixed materials and images never attest an axis', () => {
  const p = input(); Object.assign(p.storefront, { card_title: 'Burning Man vegan harness', world_label: 'Burning Man', material: 'Leather, Faux leather' });
  assert.equal(selectInventoryProduct(p, event).state, 'unknown');
  assert.equal(selectInventoryProduct(p, { kind: 'confirmed_axis', axis: 'material', value: 'vegan_leather' }).state, 'unknown');
});
test('axis evidence must be current, referenced and non-conflicting', () => {
  const p = input(); const a = { axis: 'event' as const, value: 'burning_man', source_ref: 'fixture-owner-record', snapshot_ref: p.snapshot_ref, status: 'confirmed' as const };
  p.attestations = [a]; assert.equal(selectInventoryProduct(p, event).state, 'match');
  p.attestations = [{ ...a, snapshot_ref: 'old' }]; assert.equal(selectInventoryProduct(p, event).state, 'unknown');
  p.attestations = [{ ...a, source_ref: '' }]; assert.equal(selectInventoryProduct(p, event).state, 'unknown');
  p.attestations = [a, { ...a, status: 'rejected' }]; assert.equal(selectInventoryProduct(p, event).state, 'unknown');
  p.attestations = [{ ...a, status: 'rejected' }]; assert.equal(selectInventoryProduct(p, event).state, 'no_match');
});
test('compound rules propagate unknown; a known mismatch dominates AND, a supported match dominates OR', () => {
  const p = input();
  const other: InventoryRule = { kind: 'sellable_component', codes: ['mask'], scope: 'standalone' };
  assert.equal(selectInventoryProduct(p, { kind: 'all', rules: [shoulder, event] }).state, 'unknown');
  assert.equal(selectInventoryProduct(p, { kind: 'all', rules: [other, event] }).state, 'no_match');
  assert.equal(selectInventoryProduct(p, { kind: 'any', rules: [shoulder, event] }).state, 'match');
});
test('invalid operators, extra keys, empty rules and excessive nesting fail closed', () => {
  for (const r of [{ kind: 'sql', sql: 'true' }, { ...shoulder, arbitrary: true }, { kind: 'all', rules: [] },
    { ...shoulder, codes: ['shoulders', 'shoulders'] }, { ...shoulder, codes: ['shoulders OR true'] }]) {
    assert.equal(isInventoryRule(r), false); assert.equal(selectInventoryProduct(input(), r).state, 'unknown');
  }
  let deep: InventoryRule = shoulder; for (let i = 0; i < 10; i++) deep = { kind: 'all', rules: [deep] };
  assert.equal(isInventoryRule(deep), false);
});
test('configuration variants count once and duplicate product identities become unknown', () => {
  const p = input(); p.storefront.configurations = [
    { configuration_id: 'one', component_code: 'shoulders', public_label: 'One Shoulder' },
    { configuration_id: 'two', component_code: 'shoulders', public_label: 'Pair of Shoulders' }];
  assert.equal(selectInventory([p], shoulder).length, 1);
  assert.deepEqual(selectInventory([p], shoulder)[0].configuration_ids, ['one', 'two']);
  assert.equal(selectInventory([p, p], shoulder)[0].state, 'unknown');
});
test('unknown variants, anonymous options, missing IDs and explicit exclusions do not inflate selection', () => {
  const p = input(); p.storefront.configurations = [{ configuration_id: 'one', public_label: 'Variant #1' }];
  assert.equal(selectInventoryProduct(p, shoulder).state, 'unknown');
  p.storefront.configurations = [{ configuration_id: 'one', public_label: 'Option' }];
  assert.equal(selectInventoryProduct(p, shoulder).state, 'unknown');
  p.storefront.configurations = [{ component_code: 'shoulders', public_label: 'Shoulders' }];
  assert.equal(selectInventoryProduct(p, shoulder).state, 'unknown');
  p.storefront.do_not_publish_flag = true; assert.equal(selectInventoryProduct(p, shoulder).state, 'no_match');
});
test('capture reproduces the pilot without network, writes, price changes or replacement identities', () => {
  execFileSync(process.execPath, ['--experimental-strip-types', 'scripts/audit-search-inventory.ts', '--check'], { cwd: process.cwd(), stdio: 'pipe' });
  const report = JSON.parse(readFileSync('docs/search/inventory-pilot-report-20260924.json', 'utf8'));
  assert.equal(report.catalog_integrity.unique_products, 243);
  assert.equal(report.catalog_integrity.preserved_product_page_ids, 243);
  assert.deepEqual(report.offer_counts, { ready: 223, hold: 20 });
  const armor = report.proposals.find((p: { candidate_code: string }) => p.candidate_code === 'TYPE-ARMOR');
  const harness = report.proposals.find((p: { candidate_code: string }) => p.candidate_code === 'TYPE-HARNESS');
  assert.equal(armor.selection_counts.match, 65); assert.equal(harness.selection_counts.match, 13);
  for (const p of report.proposals) {
    assert.equal(p.confirmed_distinct_design_count, null); assert.equal(p.confirmed_orderable_product_count, null);
    assert.equal(p.seo_page_id, null); assert.equal(p.query_cluster_id, null);
    assert.equal(p.can_index, false); assert.equal(p.can_publish, false);
  }
  assert.deepEqual(report.proposed_ownership_conflicts, []);
  assert.equal(report.unresolved_type_queue.length, 0);
  assert.ok(report.overlaps.filter((r: { b: string }) => r.b === 'EVENT-BM')
    .every((r: { matched_subset_jaccard: number | null; selection_complete: boolean }) => r.matched_subset_jaccard === null && !r.selection_complete));
  assert.equal(report.writes_performed, 0); assert.equal(report.approvals_changed, 0);
});
