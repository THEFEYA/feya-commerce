import type { DeliveryWorkspaceDraft, DraftShippingProfile } from './commerceDeliveryWorkspace.ts';
import { addOwnerConfirmedEurDraft, addOwnerApprovedRemoteZoneToEurDraft, FEYA_EUR_BASE_PROFILE_NAME,
  FEYA_EUR_STANDARD_MINOR, FEYA_EUR_EXPRESS_MINOR, FEYA_REMOTE_ZONE_SURCHARGE_MINOR,
  FEYA_APPROVED_REMOTE_COUNTRY_CODES } from './commerceOwnerEurRatePreset.ts';
import { normalizeRegularDeliveryWorkingWeek } from './commerceDeliveryRegularWeek.ts';

/** Owner-only draft action. All regular products inherit one EUR shipping
 * profile and buyers select the method in the future cart. This does NOT select
 * served countries beyond owner-confirmed AU/MX/NZ, approve parcel capacity,
 * enable a public rate or infer any carrier/warehouse promise. */
export function prepareUniversalBuyerShippingDraft(
  draft: DeliveryWorkspaceDraft,
  generateId: () => string,
): DeliveryWorkspaceDraft {
  let next = normalizeRegularDeliveryWorkingWeek(draft);

  // Owner's current saved v16 profile is already called "Standart/Express",
  // with EUR 19/35 and an explicit 6-9 business-day Express window.
  // Never create an unwanted second profile or silently overwrite her transit.
  const one = next.shipping_profiles.length === 1 ? next.shipping_profiles[0] : null;
  const rule = one?.rules.find(r => r.scope === 'default') || null;
  const allowedZone = (r: NonNullable<typeof rule>) => r.scope === 'zone'
    && r.countries.length === FEYA_APPROVED_REMOTE_COUNTRY_CODES.length
    && FEYA_APPROVED_REMOTE_COUNTRY_CODES.every(code => r.countries.includes(code));
  const reusable = Boolean(one && rule && one.currency === 'EUR'
    && (!next.default_shipping_profile_id || next.default_shipping_profile_id === one.id)
    && !next.assignments.some(a => a.shipping_profile_id && a.shipping_profile_id !== one.id)
    && one.max_units_per_parcel === null
    && one.rules.every(r => r === rule || allowedZone(r))
    && rule.countries.length === 0 && rule.postal_prefix === null
    && (rule.standard?.amount_minor == null || rule.standard.amount_minor === FEYA_EUR_STANDARD_MINOR)
    && (rule.express?.amount_minor == null || rule.express.amount_minor === FEYA_EUR_EXPRESS_MINOR)
  ));

  if (reusable && one && rule) {
    const seeded = addOwnerConfirmedEurDraft({
      ...next, shipping_profiles: [], default_shipping_profile_id: null,
    }, generateId).shipping_profiles[0].rules[0];
    const standard = rule.standard?.amount_minor === FEYA_EUR_STANDARD_MINOR
      ? rule.standard : seeded.standard;
    const express = rule.express?.amount_minor === FEYA_EUR_EXPRESS_MINOR
      ? rule.express : seeded.express;
    if (!standard || !express) return next;
    const remoteExists = one.rules.some(r => r.scope === 'zone'
      && r.countries.some(code => (FEYA_APPROVED_REMOTE_COUNTRY_CODES as readonly string[]).includes(code)));
    const remote = remoteExists ? [] : [{
      id: generateId(), scope: 'zone' as const, countries: [...FEYA_APPROVED_REMOTE_COUNTRY_CODES],
      postal_prefix: null,
      standard: { ...standard, amount_minor: standard.amount_minor! + FEYA_REMOTE_ZONE_SURCHARGE_MINOR },
      express: { ...express, amount_minor: express.amount_minor! + FEYA_REMOTE_ZONE_SURCHARGE_MINOR },
    }];
    const patched: DraftShippingProfile = {
      ...one, rules: [{ ...rule, standard, express }, ...remote],
      served_countries: [...new Set([...one.served_countries, ...FEYA_APPROVED_REMOTE_COUNTRY_CODES])],
    };
    next = { ...next, shipping_profiles: [patched], default_shipping_profile_id: one.id };
  } else {
    // A genuinely custom or already complete profile must never be silently
    // replaced. Legacy behavior retains exact special-profile overrides.
    if (!next.shipping_profiles.some(p => p.name === FEYA_EUR_BASE_PROFILE_NAME && p.currency === 'EUR')) {
      next = addOwnerConfirmedEurDraft(next, generateId);
    }
    next = addOwnerApprovedRemoteZoneToEurDraft(next, generateId);
    const regular = next.shipping_profiles.find(p => p.name === FEYA_EUR_BASE_PROFILE_NAME && p.currency === 'EUR');
    if (regular && next.default_shipping_profile_id === null) {
      next = { ...next, default_shipping_profile_id: regular.id };
    }
  }
  return normalizeRegularDeliveryWorkingWeek(next);
}

/** Human-readable grouped approval blockers for the owner. We do not replace
 * mechanical approval checks; the same full server-generated issues remain. */
export function summarizeDeliveryApprovalIssues(issues: Array<{ code: string; subject: string }>) {
  const groups = new Map<string, { code: string; count: number; examples: string[] }>();
  for (const issue of issues) {
    let group = groups.get(issue.code);
    if (!group) { group = { code: issue.code, count: 0, examples: [] }; groups.set(issue.code, group); }
    group.count += 1;
    if (group.examples.length < 2) group.examples.push(issue.subject);
  }
  return [...groups.values()].sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}
