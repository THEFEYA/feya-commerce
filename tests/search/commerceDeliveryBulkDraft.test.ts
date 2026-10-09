import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyDeliveryBulkProfile, applyUniformProductionProfile, getProductionAssignmentStatus } from '../../lib/commerceDeliveryBulkDraft.ts';
import { parseDeliveryWorkspace } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryCatalog } from '../fixtures/commerceDeliveryWorkspace.ts';

test('bulk assignment updates only the chosen profile axis and leaves exact-configuration overrides intact', () => {
  const d = syntheticDeliveryWorkspace(), catalog = syntheticDeliveryCatalog;
  const p = catalog[0], config = p.configurations[0].configuration_price_id;
  const customShipping = randomUUID(), customProduction = randomUUID();
  d.shipping_profiles.push({ ...structuredClone(d.shipping_profiles[0]), id: customShipping, name: 'Bulky' });
  d.production_profiles.push({ ...structuredClone(d.production_profiles[0]), id: customProduction, name: '10-14 business days' });
  const exact = { canonical_product_id: p.canonical_product_id, configuration_price_id: config,
    shipping_profile_id: d.shipping_profiles[0].id, production_profile_id: null };
  d.assignments = [exact];
  const b = applyDeliveryBulkProfile(d, catalog, [p.canonical_product_id, p.canonical_product_id, randomUUID()], 'production', customProduction);
  const changed = applyDeliveryBulkProfile(b, catalog, [p.canonical_product_id], 'shipping', customShipping);
  assert.equal(changed.assignments.length, 2);
  assert.deepEqual(changed.assignments.find(a => a.configuration_price_id === config), exact);
  assert.deepEqual(changed.assignments.find(a => a.configuration_price_id === null), {
    canonical_product_id: p.canonical_product_id, configuration_price_id: null,
    shipping_profile_id: customShipping, production_profile_id: customProduction,
  });
  assert.deepEqual(d.assignments, [exact]); // draft input immutable
  assert.doesNotThrow(() => parseDeliveryWorkspace(changed));
});

test('unknown products or profiles never enter the draft and do not change existing version', () => {
  const d = syntheticDeliveryWorkspace(), catalog = syntheticDeliveryCatalog;
  const bad = randomUUID();
  assert.equal(applyDeliveryBulkProfile(d, catalog, [bad], 'production', d.production_profiles[0].id), d);
  assert.equal(applyDeliveryBulkProfile(d, catalog, [catalog[0].canonical_product_id], 'production', bad), d);
  assert.equal(applyDeliveryBulkProfile(d, catalog, [], 'shipping', d.shipping_profiles[0].id), d);
});

test('assigned products move out of Unassigned and appear under their manufacturing-time filter', () => {
  const draft = syntheticDeliveryWorkspace(), catalog = syntheticDeliveryCatalog;
  const product = catalog[0], first = draft.production_profiles[0].id;
  assert.deepEqual(getProductionAssignmentStatus(draft, product), { kind: 'unassigned', profile_id: null });
  const saved = applyUniformProductionProfile(draft, catalog, [product.canonical_product_id], first);
  assert.deepEqual(getProductionAssignmentStatus(saved, product), { kind: 'assigned', profile_id: first });
  assert.deepEqual(getProductionAssignmentStatus(saved, catalog[1]), { kind: 'unassigned', profile_id: null });
  assert.equal(saved.assignments.filter(a => a.canonical_product_id === product.canonical_product_id).length, 1);
  assert.equal(applyUniformProductionProfile(saved, catalog, [product.canonical_product_id], first), saved);
  assert.deepEqual(draft.assignments, []);
  assert.doesNotThrow(() => parseDeliveryWorkspace(saved));
});

test('reassign manufacturing time across all options clears conflicting variant time but preserves oversize shipping override', () => {
  const draft = syntheticDeliveryWorkspace(), catalog = syntheticDeliveryCatalog;
  const p = catalog[0], otherProductionId = randomUUID();
  draft.production_profiles.push({ ...structuredClone(draft.production_profiles[0]), id: otherProductionId, name: '10–14 weekdays' });
  const originalShipping = draft.shipping_profiles[0].id;
  draft.assignments = [{
    canonical_product_id: p.canonical_product_id, configuration_price_id: null,
    production_profile_id: draft.production_profiles[0].id, shipping_profile_id: null,
  }, {
    canonical_product_id: p.canonical_product_id,
    configuration_price_id: p.configurations[0].configuration_price_id,
    production_profile_id: draft.production_profiles[0].id,
    shipping_profile_id: originalShipping,
  }];
  const result = applyUniformProductionProfile(draft, catalog, [p.canonical_product_id, randomUUID()], otherProductionId);
  assert.deepEqual(getProductionAssignmentStatus(result, p), { kind: 'assigned', profile_id: otherProductionId });
  assert.equal(result.assignments.find(a => a.configuration_price_id !== null)?.shipping_profile_id, originalShipping);
  assert.equal(result.assignments.find(a => a.configuration_price_id !== null)?.production_profile_id, null);
  assert.equal(result.assignments.find(a => a.configuration_price_id === null)?.production_profile_id, otherProductionId);
  assert.equal(result.assignments.length, 2);
  assert.equal(draft.assignments[1].production_profile_id, draft.production_profiles[0].id);
  assert.doesNotThrow(() => parseDeliveryWorkspace(result));
});

test('conflicting or partly assigned variants are visible in the Needs review bucket, never hidden as one duration', () => {
  const draft = syntheticDeliveryWorkspace(), product = structuredClone(syntheticDeliveryCatalog[0]);
  const other = randomUUID();
  draft.production_profiles.push({ ...structuredClone(draft.production_profiles[0]), id: other, name: 'other' });
  draft.assignments = [{
    canonical_product_id: product.canonical_product_id, configuration_price_id: null,
    production_profile_id: draft.production_profiles[0].id, shipping_profile_id: null,
  },{
    canonical_product_id: product.canonical_product_id,
    configuration_price_id: product.configurations[0].configuration_price_id,
    production_profile_id: other, shipping_profile_id: null,
  }];
  assert.deepEqual(getProductionAssignmentStatus(draft, product), { kind: 'assigned', profile_id: other });
  // A second configuration with inherited profile exposes two different durations.
  product.configurations.push({ configuration_price_id: randomUUID(), name: 'Separate', currencies: ['EUR'] });
  assert.deepEqual(getProductionAssignmentStatus(draft, product), { kind: 'mixed', profile_id: null });
});

test('invalid/empty requests never create a manufacturing assignment', () => {
  const draft = syntheticDeliveryWorkspace(), catalog = syntheticDeliveryCatalog;
  assert.equal(applyUniformProductionProfile(draft, catalog, [randomUUID()], draft.production_profiles[0].id), draft);
  assert.equal(applyUniformProductionProfile(draft, catalog, [catalog[0].canonical_product_id], randomUUID()), draft);
  assert.equal(applyUniformProductionProfile(draft, catalog, [], draft.production_profiles[0].id), draft);
});
