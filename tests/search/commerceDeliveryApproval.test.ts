import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { deliveryApprovalReadiness as readiness } from '../../lib/commerceDeliveryApproval.ts';
import { emptyDeliveryWorkspace } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace as draft, syntheticDeliveryCatalog as catalog, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

test('complete current catalog is mechanically ready but never grants public rates or payment', () => {
  const r = readiness(draft(), catalog); assert.equal(r.ready, true); assert.equal(r.configuration_count, 2); assert.deepEqual(r.issues, []);
  assert.equal(r.public_rates_enabled, false); assert.equal(r.payment_enabled, false); assert.equal(r.provider_session_enabled, false);
});
test('missing saved draft and incomplete settings produce a finite list rather than invented defaults', () => {
  assert.equal(readiness(null, catalog).issues[0].code, 'delivery_draft_save_required');
  const r = readiness(emptyDeliveryWorkspace(), catalog); assert.equal(r.ready, false);
  for (const code of ['delivery_schedule_required', 'delivery_calendar_required', 'delivery_combination_rule_required', 'delivery_profile_required']) assert.ok(r.issues.some(i => i.code === code));
});
test('unassigned USD examples or incomplete experimental profiles do not enter approval scope', () => {
  const d = draft(); d.shipping_profiles.push({ id: randomUUID(), name: 'Unassigned $19/$35', currency: 'USD', served_countries: [], max_units_per_parcel: null, rules: [] });
  d.production_profiles.push({ id: randomUUID(), name: 'Unassigned 7–10', duration: { min: 7, max: 10, unit: null }, calendar: null, max_units_per_order: null, requires_specifications: false });
  const r = readiness(d, catalog); assert.equal(r.ready, true); assert.deepEqual(r.shipping_profile_ids, [deliveryIds.shipping]);
});
test('actual offer currency mismatch and ambiguous offer currencies block approval without conversion', () => {
  const d = draft(); d.shipping_profiles[0].currency = 'USD';
  assert.equal(readiness(d, catalog).issues.filter(i => i.code === 'delivery_currency_mismatch').length, 2);
  const c = structuredClone(catalog); c[0].configurations[0].currencies = ['EUR','USD'];
  assert.ok(readiness(draft(), c).issues.some(i => i.code === 'delivery_offer_currency_unavailable'));
  c.forEach(p => p.configurations.forEach(c => c.currencies = [])); assert.equal(readiness(draft(), c).ready, false);
});
test('configuration and product overrides resolve independently, while no-offer configurations are excluded', () => {
  const d = draft(), sp = { ...structuredClone(d.shipping_profiles[0]), id: randomUUID(), name: 'Configuration profile' };
  d.shipping_profiles.push(sp);
  d.assignments.push({ canonical_product_id: deliveryIds.product, configuration_price_id: null, shipping_profile_id: sp.id, production_profile_id: null });
  d.assignments.push({ canonical_product_id: deliveryIds.product, configuration_price_id: deliveryIds.configuration, shipping_profile_id: deliveryIds.shipping, production_profile_id: null });
  const c = structuredClone(catalog); c[1].configurations[0].currencies = [];
  const r = readiness(d, c); assert.equal(r.ready, true); assert.equal(r.configuration_count, 1);
  assert.deepEqual(r.shipping_profile_ids, [deliveryIds.shipping]); assert.deepEqual(r.production_profile_ids, [deliveryIds.production]);
});
test('used profiles require explicit prices, day basis, calendars and quantity rules', () => {
  const d = draft(); d.production_profiles[0].duration!.unit = null; d.production_profiles[0].calendar = null; d.production_profiles[0].max_units_per_order = null;
  d.shipping_profiles[0].rules[0].standard = { amount_minor: null, transit: null, calendar: null };
  const r = readiness(d, catalog); assert.equal(r.ready, false);
  for (const code of ['delivery_rate_missing','delivery_day_basis_required','delivery_calendar_required','delivery_quantity_rule_required']) assert.ok(r.issues.some(i => i.code === code));
});
test('explicit disabled methods and postal restrictions are retained; missing baseline coverage is rejected', () => {
  const d = draft(); d.shipping_profiles[0].rules[0].express = null;
  d.shipping_profiles[0].rules.push({ id: randomUUID(), scope: 'postal_prefix', countries: ['US'], postal_prefix: '99', standard: null, express: null });
  assert.equal(readiness(d, catalog).ready, true);
  d.shipping_profiles[0].rules[0] = { ...d.shipping_profiles[0].rules[0], scope: 'country', countries: ['US'] };
  assert.equal(readiness(d, catalog).issues.filter(i => i.code === 'delivery_country_rate_required').length, 2);
});
test('equal-specificity rule collisions fail approval instead of choosing a cheaper one', () => {
  const d = draft(); d.shipping_profiles[0].rules.push({ ...structuredClone(d.shipping_profiles[0].rules[0]), id: randomUUID() });
  assert.ok(readiness(d, catalog).issues.some(i => i.code === 'delivery_rule_ambiguous'));
  const z = draft(); z.shipping_profiles[0].rules.push(...['US,AU','US,MX'].map(s => ({ ...structuredClone(z.shipping_profiles[0].rules[0]), id: randomUUID(), scope: 'zone' as const, countries: s.split(',') })));
  assert.ok(readiness(z, catalog).issues.some(i => i.code === 'delivery_rule_ambiguous'));
});
test('large incomplete catalogs keep response bounded and preserve the total number of issues', () => {
  const c = [{ canonical_product_id: randomUUID(), title: 'Product', configurations: Array.from({ length: 300 }, () => ({ configuration_price_id: randomUUID(), name: 'Variant', currencies: ['EUR'] })) }];
  const r = readiness(emptyDeliveryWorkspace(), c); assert.equal(r.issues.length, 200); assert.equal(r.configuration_count, 300); assert.ok(r.issue_count > 600);
});
