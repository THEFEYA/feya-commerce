import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCommerceDeliveryEstimate,
  type CommerceDeliveryEstimateInput,
  type DeliveryCalendar,
} from '../../lib/commerceDeliveryEstimate.ts';

// Synthetic fixtures, not owner-approved rates, calendars or public promises.
const weekdays = (): DeliveryCalendar => ({ version_id: 'test-weekdays-v1', working_weekdays: [1, 2, 3, 4, 5], holidays: [] });
const fixture = (): CommerceDeliveryEstimateInput => ({
  ready_at: '2026-10-09T08:00:00Z', // Friday morning.
  start_basis: 'preview_ready_now',
  specifications_ready: true,
  scheduling_time_zone: 'Europe/Madrid',
  cutoff_local: '16:00',
  production_lines: [{
    line_id: 'test-line-1', profile_version_id: 'test-production-v1',
    duration: { min: 1, max: 3, unit: 'business_days' }, calendar: weekdays(),
  }],
  dispatch_calendar: weekdays(),
  transit: {
    profile_version_id: 'test-transit-v1', duration: { min: 2, max: 4, unit: 'business_days' }, calendar: weekdays(),
  },
});

test('delivery combines production and transit without counting weekends as business days', () => {
  const result = calculateCommerceDeliveryEstimate(fixture());
  assert.deepEqual(result.production_ready, { from: '2026-10-12', to: '2026-10-14' });
  assert.deepEqual(result.dispatch, result.production_ready);
  assert.deepEqual(result.estimated_arrival, { from: '2026-10-14', to: '2026-10-20' });
  assert.equal(result.event_date_guaranteed, false);
});

test('cutoff is evaluated in the supplied studio timezone, including at the exact cutoff', () => {
  const input = fixture();
  input.ready_at = '2026-10-09T14:00:00Z'; // 16:00 Madrid.
  const result = calculateCommerceDeliveryEstimate(input);
  assert.equal(result.cutoff_reached, true);
  assert.deepEqual(result.production_ready, { from: '2026-10-13', to: '2026-10-15' });
});

test('calendar days remain distinct and carrier dispatch rolls to its next working date', () => {
  const input = fixture();
  input.production_lines[0].duration = { min: 1, max: 2, unit: 'calendar_days' };
  const result = calculateCommerceDeliveryEstimate(input);
  assert.deepEqual(result.production_ready, { from: '2026-10-10', to: '2026-10-11' });
  assert.deepEqual(result.dispatch, { from: '2026-10-12', to: '2026-10-12' });
});

test('a production holiday and a separate transit holiday affect the correct stage', () => {
  const input = fixture();
  input.production_lines[0].calendar.holidays = ['2026-10-12'];
  input.transit.calendar.holidays = ['2026-10-15'];
  const result = calculateCommerceDeliveryEstimate(input);
  assert.deepEqual(result.production_ready, { from: '2026-10-13', to: '2026-10-15' });
  assert.deepEqual(result.estimated_arrival, { from: '2026-10-16', to: '2026-10-21' });
});

test('one parcel waits for the slowest concurrent line rather than summing production durations', () => {
  const input = fixture();
  input.production_lines.push({
    line_id: 'test-line-2', profile_version_id: 'test-complex-v2',
    duration: { min: 5, max: 7, unit: 'business_days' }, calendar: weekdays(),
  });
  const result = calculateCommerceDeliveryEstimate(input);
  assert.deepEqual(result.production_ready, { from: '2026-10-16', to: '2026-10-20' });
  assert.deepEqual(result.estimated_arrival, { from: '2026-10-20', to: '2026-10-26' });
  assert.equal(result.profile_refs[1].profile_version_id, 'test-complex-v2');
});

test('a specifications-pending custom order has no invented production start date', () => {
  const input = fixture();
  input.specifications_ready = false;
  assert.throws(() => calculateCommerceDeliveryEstimate(input), /delivery_specifications_pending/);
});

test('unspecified day basis, missing profiles and invalid calendars fail instead of selecting defaults', () => {
  const input = fixture();
  input.production_lines[0].duration.unit = undefined as never;
  assert.throws(() => calculateCommerceDeliveryEstimate(input), /delivery_day_range_invalid/);
  const missing = fixture();
  missing.production_lines = [];
  assert.throws(() => calculateCommerceDeliveryEstimate(missing), /delivery_production_profiles_required/);
  const invalid = fixture();
  invalid.dispatch_calendar.working_weekdays = [];
  assert.throws(() => calculateCommerceDeliveryEstimate(invalid), /delivery_calendar_invalid/);
});

test('invalid local dates and duplicate line identities are rejected', () => {
  const input = fixture();
  input.transit.calendar.holidays = ['2026-02-30'];
  assert.throws(() => calculateCommerceDeliveryEstimate(input), /delivery_calendar_date_invalid/);
  const duplicate = fixture();
  duplicate.production_lines.push({ ...duplicate.production_lines[0] });
  assert.throws(() => calculateCommerceDeliveryEstimate(duplicate), /delivery_production_profile_invalid/);
});

test('timestamp and timezone must be explicit and valid', () => {
  const input = fixture();
  input.ready_at = '2026-10-09';
  assert.throws(() => calculateCommerceDeliveryEstimate(input), /delivery_start_anchor_invalid/);
  input.ready_at = '2026-10-09T08:00:00Z';
  input.scheduling_time_zone = 'not-a-time-zone';
  assert.throws(() => calculateCommerceDeliveryEstimate(input), /delivery_time_zone_invalid/);
});

test('civil-day arithmetic survives a DST boundary and preserves the confirmed basis', () => {
  const input = fixture();
  input.ready_at = '2026-10-23T08:00:00Z';
  input.start_basis = 'confirmed_ready_at';
  input.production_lines[0].duration = { min: 2, max: 2, unit: 'calendar_days' };
  input.transit.duration = { min: 1, max: 1, unit: 'calendar_days' };
  const result = calculateCommerceDeliveryEstimate(input);
  assert.deepEqual(result.production_ready, { from: '2026-10-25', to: '2026-10-25' });
  assert.deepEqual(result.dispatch, { from: '2026-10-26', to: '2026-10-26' });
  assert.deepEqual(result.estimated_arrival, { from: '2026-10-27', to: '2026-10-27' });
  assert.equal(result.start_basis, 'confirmed_ready_at');
});
