import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { addOwnerConfirmedEurDraft, FEYA_EUR_BASE_PROFILE_NAME,
  FEYA_REMOTE_ZONE_SURCHARGE_MINOR, previewRemoteEurSurcharge } from '../../lib/commerceOwnerEurRatePreset.ts';
import { emptyDeliveryWorkspace, parseDeliveryWorkspace, previewDeliveryDraft } from '../../lib/commerceDeliveryWorkspace.ts';
import { syntheticDeliveryWorkspace, syntheticDeliveryCatalog, syntheticDeliveryRequest, deliveryIds } from '../fixtures/commerceDeliveryWorkspace.ts';

test('owner EUR 19/35 preset is one draft profile, no automatic country, remote rule or payment/public activation', () => {
  const original = emptyDeliveryWorkspace(), d = addOwnerConfirmedEurDraft(original, randomUUID);
  assert.equal(original.shipping_profiles.length, 0);
  assert.equal(d.shipping_profiles.length, 1);
  assert.equal(d.default_shipping_profile_id, d.shipping_profiles[0].id);
  const p = d.shipping_profiles[0], rule = p.rules[0];
  assert.equal(p.name, FEYA_EUR_BASE_PROFILE_NAME);
  assert.equal(p.currency, 'EUR');
  assert.deepEqual(p.served_countries, []); assert.equal(p.max_units_per_parcel, null);
  assert.equal(rule.scope, 'default');
  assert.deepEqual(rule.countries, []);
  assert.equal(rule.standard?.amount_minor, 1900); assert.equal(rule.express?.amount_minor, 3500);
  assert.deepEqual(rule.standard?.transit, { min: 10, max: 14, unit: 'business_days' });
  assert.deepEqual(rule.express?.transit, { min: 7, max: 10, unit: 'business_days' });
  assert.deepEqual(rule.standard?.calendar?.working_weekdays, [1, 2, 3, 4, 5]);
  assert.deepEqual(rule.express?.calendar?.working_weekdays, [1, 2, 3, 4, 5]);
  assert.doesNotThrow(() => parseDeliveryWorkspace(d));
  assert.ok(!('payment_enabled' in d));
  assert.ok(!('public_rates_enabled' in d));
  assert.equal(addOwnerConfirmedEurDraft(d, randomUUID), d);
});

test('EUR preset preserves an existing approved-draft assignment and never overrides another default', () => {
  const current = syntheticDeliveryWorkspace(), defaultId = current.default_shipping_profile_id;
  const d = addOwnerConfirmedEurDraft(current, randomUUID);
  assert.equal(d.default_shipping_profile_id, defaultId);
  assert.equal(d.shipping_profiles.length, current.shipping_profiles.length + 1);
  assert.deepEqual(d.assignments, current.assignments);
  assert.deepEqual(d.production_profiles, current.production_profiles);
  assert.equal(current.shipping_profiles.length, 1);
});

test('unapproved destination and missing parcel limits remain explicit blockers after adding preset', () => {
  const initial = syntheticDeliveryWorkspace(), d = addOwnerConfirmedEurDraft(initial, randomUUID);
  d.default_shipping_profile_id = d.shipping_profiles.at(-1)!.id;
  d.assignments = []; // explicit override from fixture must not shadow the new default
  const request = syntheticDeliveryRequest();
  assert.throws(() => previewDeliveryDraft(d, request, syntheticDeliveryCatalog, deliveryIds.version, '2026-10-08T10:00:00.000Z'),
    /delivery_country_not_served/);
  d.shipping_profiles.at(-1)!.served_countries = ['US'];
  assert.throws(() => previewDeliveryDraft(d, request, syntheticDeliveryCatalog, deliveryIds.version, '2026-10-08T10:00:00.000Z'),
    /delivery_quantity_rule_required/);
});

test('remote surcharge only derives an EUR draft amount; it is not a country classifier or per-item tax', () => {
  assert.equal(FEYA_REMOTE_ZONE_SURCHARGE_MINOR, 2000);
  assert.equal(previewRemoteEurSurcharge(1900), 3900);
  assert.equal(previewRemoteEurSurcharge(3500), 5500);
  assert.throws(() => previewRemoteEurSurcharge(-1), /delivery_base_amount_invalid/);
  assert.throws(() => previewRemoteEurSurcharge(Number.MAX_SAFE_INTEGER), /delivery_amount_overflow/);
});
