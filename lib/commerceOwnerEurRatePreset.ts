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
