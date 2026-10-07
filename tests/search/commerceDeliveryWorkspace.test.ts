import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { emptyDeliveryWorkspace, parseDeliveryWorkspace, parseDeliveryPreviewRequest, previewDeliveryDraft, validateDeliveryAssignments } from '../../lib/commerceDeliveryWorkspace.ts';
import { deliveryIds as id, syntheticDeliveryWorkspace as fixture, syntheticDeliveryCatalog as catalog, syntheticDeliveryRequest as request } from '../fixtures/commerceDeliveryWorkspace.ts';

const now = '2026-10-08T08:00:00.000Z';
const preview = (draft = fixture(), req = request()) => previewDeliveryDraft(draft, req, catalog, id.version, now);
test('incomplete owner drafts save without silently assigning calendars, currency conversion or payable capability', () => {
  assert.deepEqual(parseDeliveryWorkspace(emptyDeliveryWorkspace()), emptyDeliveryWorkspace());
  const d = fixture(); d.production_profiles[0].duration!.unit = null;
  assert.equal(parseDeliveryWorkspace(d).production_profiles[0].duration?.unit, null);
  assert.throws(() => preview(d), /delivery_day_basis_required/);
  assert.throws(() => parseDeliveryWorkspace({ ...d, payment_enabled: true }), /delivery_draft_invalid/);
});
test('server draft preview calculates production, dispatch, dates and standard/express cost without making an order', () => {
  const result = preview();
  assert.equal(result.shipping_amount_minor, 1900); assert.equal(result.currency, 'EUR'); assert.equal(result.parcel_count, 1);
  assert.deepEqual(result.parcels[0].estimate.production_ready, { from: '2026-10-13', to: '2026-10-15' });
  assert.deepEqual(result.estimated_arrival, { from: '2026-10-27', to: '2026-11-04' });
  const express = preview(fixture(), { ...request(), shipping_method: 'express' });
  assert.equal(express.shipping_amount_minor, 3500); assert.ok(express.estimated_arrival.to < result.estimated_arrival.to);
  assert.equal(result.workspace_version_id, id.version); assert.equal(result.calculated_at, now);
  assert.equal(result.payable, false); assert.equal(result.payment_enabled, false); assert.equal(result.draft_only, true);
});
test('country and longest postal overrides take precedence, including an explicit disabled method', () => {
  const d = fixture(), base = d.shipping_profiles[0].rules[0];
  d.shipping_profiles[0].rules.push({ ...structuredClone(base), id: randomUUID(), scope: 'country', countries: ['AU'], standard: { ...base.standard!, amount_minor: 3000 } });
  d.shipping_profiles[0].rules.push({ ...structuredClone(base), id: randomUUID(), scope: 'postal_prefix', countries: ['AU'], postal_prefix: '2', standard: { ...base.standard!, amount_minor: 4200 } });
  d.shipping_profiles[0].rules.push({ ...structuredClone(base), id: randomUUID(), scope: 'postal_prefix', countries: ['AU'], postal_prefix: '20', standard: { ...base.standard!, amount_minor: 5000 }, express: null });
  assert.equal(preview(d, { ...request(), country: 'AU', postal_code: '2000' }).shipping_amount_minor, 5000);
  assert.equal(preview(d, { ...request(), country: 'AU', postal_code: '3000' }).shipping_amount_minor, 3000);
  assert.throws(() => preview(d, { ...request(), country: 'AU' }), /delivery_postal_code_required/);
  assert.throws(() => preview(d, { ...request(), country: 'AU', postal_code: '20 00', shipping_method: 'express' }), /delivery_method_unavailable/);
});
test('overlapping zones or country rules of equal specificity fail instead of choosing the cheapest rate', () => {
  const d = fixture(), base = d.shipping_profiles[0].rules[0];
  d.shipping_profiles[0].rules.push({ ...structuredClone(base), id: randomUUID(), scope: 'zone', countries: ['AU', 'MX'] });
  d.shipping_profiles[0].rules.push({ ...structuredClone(base), id: randomUUID(), scope: 'zone', countries: ['AU'] });
  assert.throws(() => preview(d, { ...request(), country: 'AU' }), /delivery_rule_ambiguous/);
});
test('an exact configuration assignment inherits missing fields independently from the product assignment', () => {
  const d = fixture(), shipping = { ...structuredClone(d.shipping_profiles[0]), id: randomUUID(), name: 'Synthetic bulky' };
  shipping.rules[0].standard!.amount_minor = 6000; d.shipping_profiles.push(shipping);
  const production = { ...structuredClone(d.production_profiles[0]), id: randomUUID(), name: 'Synthetic slow', duration: { min: 7, max: 10, unit: 'business_days' as const } };
  d.production_profiles.push(production);
  d.assignments = [
    { canonical_product_id: id.product, configuration_price_id: null, shipping_profile_id: shipping.id, production_profile_id: null },
    { canonical_product_id: id.product, configuration_price_id: id.configuration, shipping_profile_id: null, production_profile_id: production.id },
  ];
  const r = preview(d); assert.equal(r.shipping_amount_minor, 6000);
  assert.equal(r.parcels[0].estimate.profile_refs[0].profile_version_id, `${id.version}:${production.id}`);
  shipping.name = 'Renamed'; assert.equal(preview(d).shipping_amount_minor, 6000);
});
test('unserved countries, missing prices and USD/EUR mismatches do not produce a synthetic zero or conversion', () => {
  const d = fixture(); assert.throws(() => preview(d, { ...request(), country: 'SA' }), /delivery_country_not_served/);
  d.shipping_profiles[0].currency = 'USD'; assert.throws(() => preview(d), /delivery_currency_mismatch/);
  d.shipping_profiles[0].currency = 'EUR'; d.shipping_profiles[0].rules[0].standard!.amount_minor = null;
  assert.throws(() => preview(d), /delivery_rate_missing/);
  d.shipping_profiles[0].rules[0].standard!.amount_minor = 0; assert.equal(preview(d).shipping_amount_minor, 0);
});
test('mixed profiles require an explicit combination rule and account for every parcel', () => {
  const d = fixture(), bulky = { ...structuredClone(d.shipping_profiles[0]), id: randomUUID(), name: 'Synthetic bulky', max_units_per_parcel: 1 };
  bulky.rules[0].id = randomUUID(); bulky.rules[0].standard!.amount_minor = 6000; d.shipping_profiles.push(bulky);
  d.assignments.push({ canonical_product_id: id.other, configuration_price_id: null, shipping_profile_id: bulky.id, production_profile_id: null });
  const r = request(); r.lines.push({ canonical_product_id: id.other, configuration_price_id: id.otherConfiguration, quantity: 2, specifications_ready: false });
  assert.throws(() => preview(d, r), /delivery_parcel_capacity_exceeded/);
  d.combination_rule = 'separate_profile_parcels'; const result = preview(d, r);
  assert.equal(result.parcel_count, 3); assert.equal(result.shipping_amount_minor, 13900);
  assert.equal(result.parcels.reduce((n, p) => n + p.quantity, 0), 3);
  d.combination_rule = null; assert.throws(() => preview(d, r), /delivery_combination_rule_required/);
});
test('production quantity constraints and pending custom specifications block invented dates', () => {
  const d = fixture(), r = request(); d.production_profiles[0].max_units_per_order = 1; r.lines[0].quantity = 2;
  assert.throws(() => preview(d, r), /delivery_production_capacity_exceeded/);
  r.lines[0].quantity = 1; d.production_profiles[0].requires_specifications = true;
  assert.throws(() => preview(d, r), /delivery_specifications_not_ready/);
  r.lines[0].specifications_ready = true; assert.equal(preview(d, r).draft_only, true);
});
test('missing calendars, studio timezone, cutoff and parcel capacity remain explicit blockers', () => {
  for (const [field, code] of [['dispatch_calendar', /delivery_calendar_required/], ['cutoff_local', /delivery_schedule_required/], ['scheduling_time_zone', /delivery_schedule_required/]] as const) {
    const d = fixture(); d[field] = null; assert.throws(() => preview(d), code);
  }
  const d = fixture(); d.shipping_profiles[0].max_units_per_parcel = null; assert.throws(() => preview(d), /delivery_quantity_rule_required/);
});
test('invalid profile refs, duplicated targets, non-ISO countries and invalid calendars fail before storage', () => {
  const d = fixture(); d.default_shipping_profile_id = randomUUID(); assert.throws(() => parseDeliveryWorkspace(d), /reference_invalid/);
  d.default_shipping_profile_id = id.shipping; d.shipping_profiles[0].served_countries.push('ZZ'); assert.throws(() => parseDeliveryWorkspace(d), /country_invalid/);
  d.shipping_profiles[0].served_countries.pop(); d.dispatch_calendar!.holidays = ['2026-02-30']; assert.throws(() => parseDeliveryWorkspace(d), /date_invalid/);
  d.dispatch_calendar!.holidays = []; const a = { canonical_product_id: id.product, configuration_price_id: null, shipping_profile_id: id.shipping, production_profile_id: null };
  d.assignments = [a, { ...a }]; assert.throws(() => parseDeliveryWorkspace(d), /assignment_ambiguous/);
});
test('catalog binding rejects another product configuration and stale offer currency', () => {
  const d = fixture(); d.assignments.push({ canonical_product_id: id.product, configuration_price_id: id.otherConfiguration, shipping_profile_id: id.shipping, production_profile_id: null });
  assert.throws(() => validateDeliveryAssignments(d, catalog), /target_invalid/);
  const r = request(); r.lines[0].configuration_price_id = id.otherConfiguration; assert.throws(() => preview(fixture(), r), /offer_currency_unavailable/);
  const noOffer = structuredClone(catalog); noOffer[0].configurations[0].currencies = [];
  assert.throws(() => previewDeliveryDraft(fixture(), request(), noOffer, id.version, now), /offer_currency_unavailable/);
});
test('preview accepts no browser prices, currency, actor, version or clock and rejects duplicate configuration lines', () => {
  for (const extra of [{ amount_minor: 1 }, { currency: 'EUR' }, { actor_id: randomUUID() }, { server_now: now }, { country: 'ZZ' }]) assert.throws(() => parseDeliveryPreviewRequest({ ...request(), ...extra }));
  const r = request(); r.lines.push({ ...r.lines[0] }); assert.throws(() => parseDeliveryPreviewRequest(r), /basket_invalid/);
});
