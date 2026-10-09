import { calculateCommerceDeliveryEstimate, type DeliveryCalendar, type DeliveryDayRange, type CommerceDeliveryEstimate } from './commerceDeliveryEstimate.ts';
import { isFeyaBlockedExportDestination } from './commerceShippingBlockedDestinations.ts';

/** Owner drafts only. No field in this contract can enable public rates or payment. */
export const DELIVERY_WORKSPACE_CONTRACT = 'commerce_delivery_workspace_draft_v1';
export type DraftCalendar = { working_weekdays: number[]; holidays: string[] };
export type DraftDuration = { min: number; max: number; unit: DeliveryDayRange['unit'] | null };
export type DraftShippingMethod = { amount_minor: number | null; transit: DraftDuration | null; calendar: DraftCalendar | null };
export type DraftShippingRule = {
  id: string; scope: 'default' | 'zone' | 'country' | 'postal_prefix'; countries: string[]; postal_prefix: string | null;
  standard: DraftShippingMethod | null; express: DraftShippingMethod | null;
};
export type DraftShippingProfile = {
  id: string; name: string; currency: 'EUR' | 'USD'; served_countries: string[];
  max_units_per_parcel: number | null; rules: DraftShippingRule[];
};
export type DraftProductionProfile = {
  id: string; name: string; duration: DraftDuration | null; calendar: DraftCalendar | null;
  max_units_per_order: number | null; requires_specifications: boolean;
};
export type DraftDeliveryAssignment = {
  canonical_product_id: string; configuration_price_id: string | null;
  shipping_profile_id: string | null; production_profile_id: string | null;
};
export type DeliveryWorkspaceDraft = {
  contract_version: typeof DELIVERY_WORKSPACE_CONTRACT;
  scheduling_time_zone: string | null; cutoff_local: string | null; dispatch_calendar: DraftCalendar | null;
  combination_rule: 'one_parcel_highest_rate' | 'separate_profile_parcels' | null;
  default_shipping_profile_id: string | null; default_production_profile_id: string | null;
  shipping_profiles: DraftShippingProfile[]; production_profiles: DraftProductionProfile[]; assignments: DraftDeliveryAssignment[];
};
export type DeliveryCatalogProduct = {
  canonical_product_id: string; title: string;
  configurations: Array<{ configuration_price_id: string; name: string; currencies: string[] }>;
};
export type DeliveryPreviewLine = { canonical_product_id: string; configuration_price_id: string; quantity: number; specifications_ready: boolean };
export type DeliveryPreviewRequest = {
  lines: DeliveryPreviewLine[]; country: string; postal_code: string; shipping_method: 'standard' | 'express';
};
export type DeliveryDraftPreview = {
  contract_version: 'commerce_delivery_draft_preview_v1'; workspace_version_id: string; calculated_at: string;
  draft_only: true; payable: false; payment_enabled: false;
  country: string; shipping_method: 'standard' | 'express'; currency: string;
  shipping_amount_minor: number; parcel_count: number;
  parcels: Array<{ shipping_profile_ids: string[]; rule_ids: string[]; quantity: number; amount_minor: number; estimate: CommerceDeliveryEstimate }>;
  estimated_arrival: { from: string; to: string }; scheduling_time_zone: string;
};

export const DELIVERY_COUNTRIES = ('AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW').split(' ');
const countries = new Set(DELIVERY_COUNTRIES);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(v);
const record = (v: unknown): v is Record<string, unknown> => Boolean(v && typeof v === 'object' && !Array.isArray(v));
function fail(code: string): never { throw new Error(code); }
function object(v: unknown, keys: string[]) {
  if (!record(v) || Object.keys(v).sort().join(',') !== [...keys].sort().join(',')) fail('delivery_draft_invalid');
  return v as Record<string, unknown>;
}
function list(v: unknown, max: number): unknown[] {
  if (!Array.isArray(v) || v.length > max) fail('delivery_draft_invalid');
  return v as unknown[];
}
function positiveOrNull(v: unknown) {
  if (v !== null && (!Number.isSafeInteger(v) || Number(v) < 1 || Number(v) > 1000)) fail('delivery_draft_invalid');
}
function countryList(v: unknown) {
  const values = list(v, 249);
  if (new Set(values).size !== values.length || values.some(x => typeof x !== 'string' || !countries.has(x))) fail('delivery_country_invalid');
}
function duration(v: unknown) {
  if (v === null) return;
  const d = object(v, ['min', 'max', 'unit']);
  if (!Number.isInteger(d.min) || !Number.isInteger(d.max) || Number(d.min) < 0 || Number(d.max) < Number(d.min)
    || Number(d.max) > 365 || (d.unit !== null && !['calendar_days', 'business_days'].includes(String(d.unit)))) fail('delivery_day_range_invalid');
}
function calendar(v: unknown) {
  if (v === null) return;
  const c = object(v, ['working_weekdays', 'holidays']);
  const days = list(c.working_weekdays, 7), holidays = list(c.holidays, 400);
  if (!days.length || new Set(days).size !== days.length || days.some(x => !Number.isInteger(x) || Number(x) < 1 || Number(x) > 7)
    || new Set(holidays).size !== holidays.length) fail('delivery_calendar_invalid');
  for (const day of holidays) {
    if (typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day)) fail('delivery_calendar_date_invalid');
    const date = new Date(`${day}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== day) fail('delivery_calendar_date_invalid');
  }
}
function name(v: unknown) { if (typeof v !== 'string' || !v.trim() || v.length > 120) fail('delivery_profile_name_invalid'); }
function method(v: unknown) {
  if (v === null) return;
  const m = object(v, ['amount_minor', 'transit', 'calendar']);
  if (m.amount_minor !== null && (!Number.isSafeInteger(m.amount_minor) || Number(m.amount_minor) < 0 || Number(m.amount_minor) > 100000000)) fail('delivery_amount_invalid');
  duration(m.transit); calendar(m.calendar);
}
export function emptyDeliveryWorkspace(): DeliveryWorkspaceDraft {
  return { contract_version: DELIVERY_WORKSPACE_CONTRACT, scheduling_time_zone: null, cutoff_local: null, dispatch_calendar: null,
    combination_rule: null, default_shipping_profile_id: null, default_production_profile_id: null, shipping_profiles: [], production_profiles: [], assignments: [] };
}

/** Incomplete drafts may be saved; no incomplete configuration can produce a price/date preview. */
export function parseDeliveryWorkspace(input: unknown): DeliveryWorkspaceDraft {
  const d = object(input, Object.keys(emptyDeliveryWorkspace()));
  if (d.contract_version !== DELIVERY_WORKSPACE_CONTRACT || JSON.stringify(d).length > 512000) fail('delivery_draft_invalid');
  if (d.scheduling_time_zone !== null) {
    if (typeof d.scheduling_time_zone !== 'string' || d.scheduling_time_zone.length > 100) fail('delivery_time_zone_invalid');
    try { new Intl.DateTimeFormat('en', { timeZone: d.scheduling_time_zone as string }); } catch { fail('delivery_time_zone_invalid'); }
  }
  if (d.cutoff_local !== null && (typeof d.cutoff_local !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(d.cutoff_local))) fail('delivery_cutoff_invalid');
  calendar(d.dispatch_calendar);
  if (d.combination_rule !== null && !['one_parcel_highest_rate', 'separate_profile_parcels'].includes(String(d.combination_rule))) fail('delivery_combination_rule_invalid');
  const shipping = new Set<string>(), production = new Set<string>();
  for (const item of list(d.shipping_profiles, 50)) {
    const p = object(item, ['id', 'name', 'currency', 'served_countries', 'max_units_per_parcel', 'rules']);
    if (!uuid(p.id) || shipping.has(p.id) || !['EUR', 'USD'].includes(String(p.currency))) fail('delivery_profile_invalid');
    shipping.add(p.id); name(p.name); countryList(p.served_countries); positiveOrNull(p.max_units_per_parcel);
    const ids = new Set<string>();
    for (const value of list(p.rules, 100)) {
      const r = object(value, ['id', 'scope', 'countries', 'postal_prefix', 'standard', 'express']);
      if (!uuid(r.id) || ids.has(r.id)) fail('delivery_rule_invalid');
      ids.add(r.id); countryList(r.countries);
      const cs = r.countries as string[];
      if (!['default', 'zone', 'country', 'postal_prefix'].includes(String(r.scope))
        || (r.scope === 'default' && cs.length !== 0) || (r.scope === 'zone' && cs.length === 0)
        || (['country', 'postal_prefix'].includes(String(r.scope)) && cs.length !== 1)
        || cs.some(c => !(p.served_countries as string[]).includes(c))) fail('delivery_rule_invalid');
      if (r.scope === 'postal_prefix') {
        if (typeof r.postal_prefix !== 'string' || !/^[A-Z0-9]{1,12}$/.test(r.postal_prefix)) fail('delivery_postal_rule_invalid');
      } else if (r.postal_prefix !== null) fail('delivery_postal_rule_invalid');
      method(r.standard); method(r.express);
    }
  }
  for (const item of list(d.production_profiles, 50)) {
    const p = object(item, ['id', 'name', 'duration', 'calendar', 'max_units_per_order', 'requires_specifications']);
    if (!uuid(p.id) || production.has(p.id) || typeof p.requires_specifications !== 'boolean') fail('delivery_profile_invalid');
    production.add(p.id); name(p.name); duration(p.duration); calendar(p.calendar); positiveOrNull(p.max_units_per_order);
  }
  for (const [key, ids] of [['default_shipping_profile_id', shipping], ['default_production_profile_id', production]] as const) {
    if (d[key] !== null && (typeof d[key] !== 'string' || !ids.has(d[key] as string))) fail('delivery_profile_reference_invalid');
  }
  const targets = new Set<string>();
  for (const item of list(d.assignments, 1200)) {
    const a = object(item, ['canonical_product_id', 'configuration_price_id', 'shipping_profile_id', 'production_profile_id']);
    if (!uuid(a.canonical_product_id) || (a.configuration_price_id !== null && !uuid(a.configuration_price_id))
      || (a.shipping_profile_id === null && a.production_profile_id === null)
      || (a.shipping_profile_id !== null && (typeof a.shipping_profile_id !== 'string' || !shipping.has(a.shipping_profile_id)))
      || (a.production_profile_id !== null && (typeof a.production_profile_id !== 'string' || !production.has(a.production_profile_id)))) fail('delivery_assignment_invalid');
    const target = `${a.canonical_product_id}:${a.configuration_price_id}`;
    if (targets.has(target)) fail('delivery_assignment_ambiguous');
    targets.add(target);
  }
  return d as unknown as DeliveryWorkspaceDraft;
}

/** Catalog identities and currencies come from a protected server RPC, never from the browser. */
export function validateDeliveryAssignments(draft: DeliveryWorkspaceDraft, catalog: DeliveryCatalogProduct[]) {
  for (const a of draft.assignments) {
    const product = catalog.find(p => p.canonical_product_id === a.canonical_product_id);
    if (!product || (a.configuration_price_id && !product.configurations.some(c => c.configuration_price_id === a.configuration_price_id))) fail('delivery_assignment_target_invalid');
  }
}
export function parseDeliveryPreviewRequest(input: unknown): DeliveryPreviewRequest {
  const d = object(input, ['lines', 'country', 'postal_code', 'shipping_method']);
  if (typeof d.country !== 'string' || !countries.has(d.country)) fail('delivery_country_invalid');
  if (typeof d.postal_code !== 'string' || d.postal_code.length > 32 || !/^[A-Za-z0-9 -]*$/.test(d.postal_code)) fail('delivery_postal_code_invalid');
  if (!['standard', 'express'].includes(String(d.shipping_method))) fail('delivery_method_invalid');
  const lines = list(d.lines, 20), seen = new Set<string>();
  if (!lines.length) fail('delivery_basket_empty');
  for (const item of lines) {
    const l = object(item, ['canonical_product_id', 'configuration_price_id', 'quantity', 'specifications_ready']);
    if (!uuid(l.canonical_product_id) || !uuid(l.configuration_price_id) || !Number.isInteger(l.quantity) || Number(l.quantity) < 1
      || Number(l.quantity) > 1000 || typeof l.specifications_ready !== 'boolean' || seen.has(l.configuration_price_id)) fail('delivery_basket_invalid');
    seen.add(l.configuration_price_id);
  }
  return d as unknown as DeliveryPreviewRequest;
}

function selectedProfile(d: DeliveryWorkspaceDraft, line: DeliveryPreviewLine, kind: 'shipping' | 'production') {
  const key = kind === 'shipping' ? 'shipping_profile_id' : 'production_profile_id';
  const exact = d.assignments.find(a => a.canonical_product_id === line.canonical_product_id && a.configuration_price_id === line.configuration_price_id);
  const product = d.assignments.find(a => a.canonical_product_id === line.canonical_product_id && a.configuration_price_id === null);
  return exact?.[key] ?? product?.[key] ?? (kind === 'shipping' ? d.default_shipping_profile_id : d.default_production_profile_id);
}
function ruleFor(profile: DraftShippingProfile, request: DeliveryPreviewRequest) {
  // Owner/carrier suspension is an absolute deny even if legacy draft data
  // mistakenly contains this ISO code as a served country.
  if (isFeyaBlockedExportDestination(request.country)) fail('delivery_country_blocked');
  if (!profile.served_countries.includes(request.country)) fail('delivery_country_not_served');
  const postal = request.postal_code.toUpperCase().replace(/[ -]/g, '');
  const prefixRules = profile.rules.filter(r => r.scope === 'postal_prefix' && r.countries.includes(request.country));
  // Empty postal input cannot accidentally select the cheaper country/default rule.
  if (prefixRules.length && !postal) fail('delivery_postal_code_required');
  const matches = profile.rules.flatMap(rule => {
    const score = rule.scope === 'default' ? 0 : !rule.countries.includes(request.country) ? -1
      : rule.scope === 'zone' ? 1 : rule.scope === 'country' ? 2
      : postal.startsWith(rule.postal_prefix || '!') ? 3 + (rule.postal_prefix?.length || 0) : -1;
    return score >= 0 ? [{ rule, score }] : [];
  }).sort((a, b) => b.score - a.score);
  if (!matches.length) fail('delivery_rate_missing');
  if (matches.length > 1 && matches[0].score === matches[1].score) fail('delivery_rule_ambiguous');
  const selected = matches[0].rule, selectedMethod = selected[request.shipping_method];
  // A disabled override blocks this method; it never falls back to a default rate.
  if (!selectedMethod) fail('delivery_method_unavailable');
  if (selectedMethod.amount_minor === null) fail('delivery_rate_missing');
  return { rule: selected, method: selectedMethod };
}
function approvedShape(range: DraftDuration | null): DeliveryDayRange {
  if (!range?.unit) fail('delivery_day_basis_required');
  return range as DeliveryDayRange;
}
function fullCalendar(c: DraftCalendar | null, ref: string): DeliveryCalendar {
  if (!c) fail('delivery_calendar_required');
  return { ...c, version_id: ref };
}

/** Read-only owner simulation. Even a complete result is not a public shipping quote. */
export function previewDeliveryDraft(rawDraft: unknown, rawRequest: unknown, catalog: DeliveryCatalogProduct[], workspaceVersionId: string, serverNow: string): DeliveryDraftPreview {
  const d = parseDeliveryWorkspace(rawDraft), r = parseDeliveryPreviewRequest(rawRequest);
  validateDeliveryAssignments(d, catalog);
  if (!uuid(workspaceVersionId)) fail('delivery_version_required');
  if (!d.combination_rule) fail('delivery_combination_rule_required');
  if (!d.scheduling_time_zone || !d.cutoff_local) fail('delivery_schedule_required');
  const ref = (id: string) => `${workspaceVersionId}:${id}`;
  const lines = r.lines.map((line, index) => {
    const config = catalog.find(p => p.canonical_product_id === line.canonical_product_id)?.configurations.find(c => c.configuration_price_id === line.configuration_price_id);
    if (!config || config.currencies.length !== 1) fail('delivery_offer_currency_unavailable');
    const sp = d.shipping_profiles.find(p => p.id === selectedProfile(d, line, 'shipping'));
    const pp = d.production_profiles.find(p => p.id === selectedProfile(d, line, 'production'));
    if (!sp || !pp) fail('delivery_profile_required');
    if (sp.currency !== config.currencies[0]) fail('delivery_currency_mismatch');
    if (!sp.max_units_per_parcel || !pp.max_units_per_order) fail('delivery_quantity_rule_required');
    if (pp.requires_specifications && !line.specifications_ready) fail('delivery_specifications_not_ready');
    return { line, index, sp, pp, ...ruleFor(sp, r) };
  });
  const allCurrencies = new Set(lines.map(l => l.sp.currency));
  if (allCurrencies.size !== 1) fail('delivery_currency_mismatch');
  for (const id of new Set(lines.map(l => l.pp.id))) {
    const group = lines.filter(l => l.pp.id === id);
    if (group.reduce((n, l) => n + l.line.quantity, 0) > group[0].pp.max_units_per_order!) fail('delivery_production_capacity_exceeded');
  }
  type ResolvedLine = typeof lines[number];
  const productionLines = (group: ResolvedLine[]) => group.map(l => ({ line_id: String(l.index), profile_version_id: ref(l.pp.id),
    duration: approvedShape(l.pp.duration), calendar: fullCalendar(l.pp.calendar, ref(`${l.pp.id}:production`)) }));
  const estimateFor = (group: ResolvedLine[], transit: ResolvedLine) => calculateCommerceDeliveryEstimate({
    ready_at: serverNow, start_basis: 'preview_ready_now', specifications_ready: true,
    scheduling_time_zone: d.scheduling_time_zone!, cutoff_local: d.cutoff_local!,
    production_lines: productionLines(group), dispatch_calendar: fullCalendar(d.dispatch_calendar, ref('dispatch')),
    transit: { profile_version_id: ref(transit.rule.id), duration: approvedShape(transit.method.transit), calendar: fullCalendar(transit.method.calendar, ref(`${transit.rule.id}:${r.shipping_method}:transit`)) },
  });
  const parcels: DeliveryDraftPreview['parcels'] = [];
  if (d.combination_rule === 'one_parcel_highest_rate') {
    const quantity = lines.reduce((n, l) => n + l.line.quantity, 0);
    if (lines.some(l => quantity > l.sp.max_units_per_parcel!)) fail('delivery_parcel_capacity_exceeded');
    const estimates = lines.map(l => estimateFor(lines, l));
    const latest = estimates.reduce((a, b) => a.estimated_arrival.to > b.estimated_arrival.to ? a : b);
    parcels.push({ shipping_profile_ids: [...new Set(lines.map(l => l.sp.id))], rule_ids: [...new Set(lines.map(l => l.rule.id))], quantity,
      amount_minor: Math.max(...lines.map(l => l.method.amount_minor!)), estimate: { ...latest, estimated_arrival: {
        from: estimates.map(e => e.estimated_arrival.from).sort().at(-1)!, to: estimates.map(e => e.estimated_arrival.to).sort().at(-1)! } } });
  } else {
    for (const id of new Set(lines.map(l => l.sp.id))) {
      const group = lines.filter(l => l.sp.id === id), first = group[0];
      const quantity = group.reduce((n, l) => n + l.line.quantity, 0);
      const count = Math.ceil(quantity / first.sp.max_units_per_parcel!);
      if (count + parcels.length > 100) fail('delivery_parcel_limit_exceeded');
      const estimate = estimateFor(group, first);
      for (let i = 0; i < count; i++) parcels.push({ shipping_profile_ids: [id], rule_ids: [first.rule.id],
        quantity: Math.min(first.sp.max_units_per_parcel!, quantity - i * first.sp.max_units_per_parcel!), amount_minor: first.method.amount_minor!, estimate });
    }
  }
  const total = parcels.reduce((n, p) => n + p.amount_minor, 0);
  if (!Number.isSafeInteger(total)) fail('delivery_amount_overflow');
  return { contract_version: 'commerce_delivery_draft_preview_v1', workspace_version_id: workspaceVersionId, calculated_at: serverNow,
    draft_only: true, payable: false, payment_enabled: false, country: r.country, shipping_method: r.shipping_method,
    currency: lines[0].sp.currency, shipping_amount_minor: total, parcel_count: parcels.length, parcels,
    estimated_arrival: { from: parcels.map(p => p.estimate.estimated_arrival.from).sort().at(-1)!, to: parcels.map(p => p.estimate.estimated_arrival.to).sort().at(-1)! },
    scheduling_time_zone: d.scheduling_time_zone };
}
