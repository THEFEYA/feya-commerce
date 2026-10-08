import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { applyDeliveryBulkProfile } from '../../lib/commerceDeliveryBulkDraft.ts';
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
