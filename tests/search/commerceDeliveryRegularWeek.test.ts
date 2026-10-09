import test from 'node:test';
import assert from 'node:assert/strict';
import { syntheticDeliveryWorkspace } from '../fixtures/commerceDeliveryWorkspace.ts';
import { emptyDeliveryWorkspace, parseDeliveryWorkspace } from '../../lib/commerceDeliveryWorkspace.ts';
import { normalizeRegularDeliveryWorkingWeek, standardWeekCalendar } from '../../lib/commerceDeliveryRegularWeek.ts';

test('normal owner delivery dates always use weekdays and keep explicit holidays, even if older draft had weekends', () => {
  const d = syntheticDeliveryWorkspace();
  d.production_profiles[0].duration!.unit = 'calendar_days';
  d.production_profiles[0].calendar = { working_weekdays: [1, 3, 6, 7], holidays: ['2026-12-25'] };
  d.dispatch_calendar = { working_weekdays: [6, 7], holidays: ['2026-12-26'] };
  d.shipping_profiles[0].rules[0].standard!.transit!.unit = 'calendar_days';
  d.shipping_profiles[0].rules[0].standard!.calendar = { working_weekdays: [1, 5, 6], holidays: [] };
  const n = normalizeRegularDeliveryWorkingWeek(d);
  assert.deepEqual(n.dispatch_calendar?.working_weekdays, [1, 2, 3, 4, 5]);
  assert.deepEqual(n.dispatch_calendar?.holidays, ['2026-12-26']);
  assert.deepEqual(n.production_profiles[0].calendar?.working_weekdays, [1, 2, 3, 4, 5]);
  assert.deepEqual(n.production_profiles[0].calendar?.holidays, ['2026-12-25']);
  assert.equal(n.production_profiles[0].duration?.unit, 'business_days');
  assert.equal(n.shipping_profiles[0].rules[0].standard?.transit?.unit, 'business_days');
  assert.deepEqual(n.shipping_profiles[0].rules[0].standard?.calendar?.working_weekdays, [1, 2, 3, 4, 5]);
  assert.equal(d.production_profiles[0].duration?.unit, 'calendar_days');
  assert.deepEqual(d.dispatch_calendar?.working_weekdays, [6, 7]);
  assert.doesNotThrow(() => parseDeliveryWorkspace(n));
});

test('empty draft gets weekday dispatch but no invented carrier price, holiday or order cutoff', () => {
  const original = emptyDeliveryWorkspace();
  const n = normalizeRegularDeliveryWorkingWeek(original);
  assert.deepEqual(n.dispatch_calendar, standardWeekCalendar(null));
  assert.equal(n.cutoff_local, null);
  assert.equal(n.default_shipping_profile_id, null);
  assert.equal(n.shipping_profiles.length, 0);
  assert.equal(n.assignments.length, 0);
  assert.deepEqual(original.dispatch_calendar, null);
  assert.deepEqual(normalizeRegularDeliveryWorkingWeek(n), n);
});

test('priority manufacturing weekend option does not exist in normal draft', () => {
  const n = normalizeRegularDeliveryWorkingWeek(syntheticDeliveryWorkspace());
  assert.ok(n.production_profiles.every(p => p.calendar?.working_weekdays.every(d => d >= 1 && d <= 5)));
  assert.ok(!('priority_manufacturing_enabled' in n));
  assert.ok(!('payment_enabled' in n));
});
