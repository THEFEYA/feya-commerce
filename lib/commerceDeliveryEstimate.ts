/**
 * Internal delivery-date arithmetic, not a shipping-price or capacity authority.
 * A server resolver must supply approved profile/calendar versions and a start
 * anchor. Nothing in this module is mounted by the public checkout.
 *
 * Dates are civil dates in scheduling_time_zone, not UTC timestamps. The start
 * day is day zero. Business days skip the supplied weekends and holidays;
 * calendar days count every date. Transit starts after eligible carrier dispatch.
 */
export type DeliveryDayRange = {
  min: number;
  max: number;
  unit: 'calendar_days' | 'business_days';
};

export type DeliveryCalendar = {
  version_id: string;
  /** ISO weekdays: Monday=1 ... Sunday=7. */
  working_weekdays: number[];
  holidays: string[];
};

export type DeliveryProductionLine = {
  line_id: string;
  profile_version_id: string;
  duration: DeliveryDayRange;
  calendar: DeliveryCalendar;
};

export type CommerceDeliveryEstimateInput = {
  /** Server-supplied timestamp with Z or an explicit offset; never browser now. */
  ready_at: string;
  start_basis: 'preview_ready_now' | 'confirmed_ready_at';
  /** False for an order awaiting measurements or design approval. */
  specifications_ready: boolean;
  scheduling_time_zone: string;
  cutoff_local: string;
  /** One parcel, concurrent production; multiple parcels need separate estimates. */
  production_lines: DeliveryProductionLine[];
  dispatch_calendar: DeliveryCalendar;
  transit: {
    profile_version_id: string;
    duration: DeliveryDayRange;
    calendar: DeliveryCalendar;
  };
};

export type DeliveryDateWindow = { from: string; to: string };

export type CommerceDeliveryEstimate = {
  contract_version: 'commerce_delivery_estimate_v1';
  ready_at: string;
  start_basis: CommerceDeliveryEstimateInput['start_basis'];
  scheduling_time_zone: string;
  cutoff_local: string;
  cutoff_reached: boolean;
  shipment_mode: 'ship_together';
  production_ready: DeliveryDateWindow;
  dispatch: DeliveryDateWindow;
  estimated_arrival: DeliveryDateWindow;
  profile_refs: Array<{ line_id: string; profile_version_id: string; calendar_version_id: string }>;
  dispatch_calendar_version_id: string;
  transit_profile_version_id: string;
  transit_calendar_version_id: string;
  event_date_guaranteed: false;
};

const CIVIL_DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/;
const MAX_WALK_DAYS = 10000;

function fail(code: string): never {
  throw new Error(code);
}

function validRef(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= 200;
}

function dateFromCivil(value: string): Date {
  if (!CIVIL_DATE.test(value)) fail('delivery_calendar_date_invalid');
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    fail('delivery_calendar_date_invalid');
  }
  return date;
}

function nextDate(value: string): string {
  const date = dateFromCivil(value);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function validateRange(range: DeliveryDayRange) {
  if (!range || !Number.isInteger(range.min) || !Number.isInteger(range.max)
    || range.min < 0 || range.max < range.min || range.max > 365
    || !['calendar_days', 'business_days'].includes(range.unit)) {
    fail('delivery_day_range_invalid');
  }
}

function validateCalendar(calendar: DeliveryCalendar) {
  if (!calendar || !validRef(calendar.version_id)
    || !Array.isArray(calendar.working_weekdays) || calendar.working_weekdays.length < 1
    || calendar.working_weekdays.length > 7
    || new Set(calendar.working_weekdays).size !== calendar.working_weekdays.length
    || calendar.working_weekdays.some(day => !Number.isInteger(day) || day < 1 || day > 7)
    || !Array.isArray(calendar.holidays) || calendar.holidays.length > 2000) {
    fail('delivery_calendar_invalid');
  }
  for (const day of calendar.holidays) {
    if (typeof day !== 'string') fail('delivery_calendar_date_invalid');
    dateFromCivil(day);
  }
}

function makeCalendar(calendar: DeliveryCalendar) {
  const holidays = new Set(calendar.holidays);
  const weekdays = new Set(calendar.working_weekdays);
  return (date: string) => {
    const weekday = dateFromCivil(date).getUTCDay() || 7;
    return weekdays.has(weekday) && !holidays.has(date);
  };
}

function rollToWorkingDate(date: string, isWorking: (date: string) => boolean) {
  let cursor = date;
  for (let walked = 0; walked < MAX_WALK_DAYS; walked++) {
    if (isWorking(cursor)) return cursor;
    cursor = nextDate(cursor);
  }
  return fail('delivery_calendar_horizon_exceeded');
}

function addDuration(date: string, count: number, unit: DeliveryDayRange['unit'], isWorking: (date: string) => boolean) {
  let cursor = date;
  let counted = 0;
  for (let walked = 0; counted < count; walked++) {
    if (walked >= MAX_WALK_DAYS) fail('delivery_calendar_horizon_exceeded');
    cursor = nextDate(cursor);
    if (unit === 'calendar_days' || isWorking(cursor)) counted++;
  }
  return cursor;
}

function localAnchor(input: CommerceDeliveryEstimateInput) {
  if (typeof input.ready_at !== 'string' || !TIMESTAMP.test(input.ready_at)) fail('delivery_start_anchor_invalid');
  dateFromCivil(input.ready_at.slice(0, 10));
  const instant = new Date(input.ready_at);
  if (!Number.isFinite(instant.getTime())) fail('delivery_start_anchor_invalid');
  if (typeof input.cutoff_local !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(input.cutoff_local)) {
    fail('delivery_cutoff_invalid');
  }
  if (!validRef(input.scheduling_time_zone)) fail('delivery_time_zone_invalid');
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: input.scheduling_time_zone, year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(instant);
  } catch {
    return fail('delivery_time_zone_invalid');
  }
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  const date = `${values.year}-${values.month}-${values.day}`;
  dateFromCivil(date);
  const cutoffReached = `${values.hour}:${values.minute}` >= input.cutoff_local;
  return { date: cutoffReached ? nextDate(date) : date, cutoffReached, instant };
}

export function calculateCommerceDeliveryEstimate(input: CommerceDeliveryEstimateInput): CommerceDeliveryEstimate {
  if (!input || !['preview_ready_now', 'confirmed_ready_at'].includes(input.start_basis)) {
    fail('delivery_start_basis_required');
  }
  if (input.specifications_ready !== true) fail('delivery_specifications_pending');
  if (!Array.isArray(input.production_lines) || input.production_lines.length < 1 || input.production_lines.length > 20) {
    fail('delivery_production_profiles_required');
  }
  const lineIds = new Set<string>();
  for (const line of input.production_lines) {
    if (!line || !validRef(line.line_id) || !validRef(line.profile_version_id) || lineIds.has(line.line_id)) {
      fail('delivery_production_profile_invalid');
    }
    lineIds.add(line.line_id);
    validateRange(line.duration);
    validateCalendar(line.calendar);
  }
  validateCalendar(input.dispatch_calendar);
  if (!input.transit || !validRef(input.transit.profile_version_id)) fail('delivery_transit_profile_required');
  validateRange(input.transit.duration);
  validateCalendar(input.transit.calendar);
  const anchor = localAnchor(input);
  const productionWindows = input.production_lines.map(line => {
    const isWorking = makeCalendar(line.calendar);
    const start = rollToWorkingDate(anchor.date, isWorking);
    return {
      from: addDuration(start, line.duration.min, line.duration.unit, isWorking),
      to: addDuration(start, line.duration.max, line.duration.unit, isWorking),
    };
  });
  // Concurrent production, one parcel: the slowest ready line controls dispatch.
  const productionReady = {
    from: productionWindows.map(window => window.from).sort().at(-1)!,
    to: productionWindows.map(window => window.to).sort().at(-1)!,
  };
  const dispatchWorking = makeCalendar(input.dispatch_calendar);
  const dispatch = {
    from: rollToWorkingDate(productionReady.from, dispatchWorking),
    to: rollToWorkingDate(productionReady.to, dispatchWorking),
  };
  const transitWorking = makeCalendar(input.transit.calendar);
  return {
    contract_version: 'commerce_delivery_estimate_v1',
    ready_at: anchor.instant.toISOString(),
    start_basis: input.start_basis,
    scheduling_time_zone: input.scheduling_time_zone,
    cutoff_local: input.cutoff_local,
    cutoff_reached: anchor.cutoffReached,
    shipment_mode: 'ship_together',
    production_ready: productionReady,
    dispatch,
    estimated_arrival: {
      from: addDuration(dispatch.from, input.transit.duration.min, input.transit.duration.unit, transitWorking),
      to: addDuration(dispatch.to, input.transit.duration.max, input.transit.duration.unit, transitWorking),
    },
    profile_refs: input.production_lines.map(line => ({
      line_id: line.line_id,
      profile_version_id: line.profile_version_id,
      calendar_version_id: line.calendar.version_id,
    })),
    dispatch_calendar_version_id: input.dispatch_calendar.version_id,
    transit_profile_version_id: input.transit.profile_version_id,
    transit_calendar_version_id: input.transit.calendar.version_id,
    event_date_guaranteed: false,
  };
}
