import type { DeliveryWorkspaceDraft, DraftShippingProfile } from './commerceDeliveryWorkspace.ts';

/**
 * Owner-confirmed new EUR commercial prices. Never infer a currency exchange
 * from historic USD examples or install a payable/public rate in this helper.
 * Customer destinations and parcel capacity deliberately require human review.
 */
export const FEYA_EUR_BASE_PROFILE_NAME = 'TheFEYA — Standard €19 / Express €35';
export const FEYA_EUR_STANDARD_MINOR = 1900;
export const FEYA_EUR_EXPRESS_MINOR = 3500;
export const FEYA_REMOTE_ZONE_SURCHARGE_MINOR = 2000;

export function addOwnerConfirmedEurDraft(
  draft: DeliveryWorkspaceDraft,
  generateId: () => string,
): DeliveryWorkspaceDraft {
  if (draft.shipping_profiles.length >= 50
    || draft.shipping_profiles.some(p => p.name === FEYA_EUR_BASE_PROFILE_NAME)) return draft;
  const profileId = generateId(), ruleId = generateId();
  const weekdays = () => ({ working_weekdays: [1, 2, 3, 4, 5], holidays: [] as string[] });
  const profile: DraftShippingProfile = {
    id: profileId,
    name: FEYA_EUR_BASE_PROFILE_NAME,
    currency: 'EUR',
    served_countries: [],
    max_units_per_parcel: null,
    rules: [{
      id: ruleId, scope: 'default', countries: [], postal_prefix: null,
      standard: {
        amount_minor: FEYA_EUR_STANDARD_MINOR,
        transit: { min: 10, max: 14, unit: 'business_days' }, calendar: weekdays(),
      },
      express: {
        amount_minor: FEYA_EUR_EXPRESS_MINOR,
        transit: { min: 7, max: 10, unit: 'business_days' }, calendar: weekdays(),
      },
    }],
  };
  return {
    ...draft, shipping_profiles: [...draft.shipping_profiles, profile],
    default_shipping_profile_id: draft.default_shipping_profile_id ?? profileId,
  };
}

/** Explicit owner-entered country grouping only: never derive island/remote from
 * country metadata or make remote rates public by running this calculation. */
export function previewRemoteEurSurcharge(
  baseMinor: number,
): number {
  if (!Number.isSafeInteger(baseMinor) || baseMinor < 0) throw new Error('delivery_base_amount_invalid');
  const total = baseMinor + FEYA_REMOTE_ZONE_SURCHARGE_MINOR;
  if (!Number.isSafeInteger(total)) throw new Error('delivery_amount_overflow');
  return total;
}

/** Explicitly authorized by the owner on 2026-10-08.
 * This modifies a private *draft* only; never publishes or assumes all countries
 * are served. Saudi Arabia is deliberately NOT in this surcharge zone. */
export const FEYA_APPROVED_REMOTE_COUNTRY_CODES = ['AU', 'MX', 'NZ'] as const;

export function addOwnerApprovedRemoteZoneToEurDraft(
  draft: DeliveryWorkspaceDraft,
  generateId: () => string,
): DeliveryWorkspaceDraft {
  const profile = draft.shipping_profiles.find(p => p.name === FEYA_EUR_BASE_PROFILE_NAME && p.currency === 'EUR');
  if (!profile) return draft;

  // An overlapping zone would make tariff priority ambiguous. Do not silently
  // overwrite bespoke country/postal tariffs or insert another competing zone.
  if (profile.rules.some(rule => rule.scope === 'zone'
    && rule.countries.some(code => (FEYA_APPROVED_REMOTE_COUNTRY_CODES as readonly string[]).includes(code)))) return draft;

  const base = profile.rules.find(rule => rule.scope === 'default'
    && rule.standard?.amount_minor != null && rule.express?.amount_minor != null);
  if (!base?.standard || !base.express) return draft;
  if (profile.rules.length >= 100) return draft;

  const zoneRule = {
    id: generateId(),
    scope: 'zone' as const,
    countries: [...FEYA_APPROVED_REMOTE_COUNTRY_CODES],
    postal_prefix: null,
    standard: { ...base.standard, amount_minor: previewRemoteEurSurcharge(base.standard.amount_minor!) },
    express: { ...base.express, amount_minor: previewRemoteEurSurcharge(base.express.amount_minor!) },
  };
  const patched: DraftShippingProfile = {
    ...profile,
    served_countries: [...new Set([...profile.served_countries, ...FEYA_APPROVED_REMOTE_COUNTRY_CODES])],
    rules: [...profile.rules, zoneRule],
  };
  return { ...draft, shipping_profiles: draft.shipping_profiles.map(p => p.id === profile.id ? patched : p) };
}
