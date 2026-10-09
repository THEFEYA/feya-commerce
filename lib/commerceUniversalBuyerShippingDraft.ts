import type { DeliveryWorkspaceDraft, DraftShippingProfile } from './commerceDeliveryWorkspace.ts';
import { addOwnerConfirmedEurDraft, addOwnerApprovedRemoteZoneToEurDraft, FEYA_EUR_BASE_PROFILE_NAME } from './commerceOwnerEurRatePreset.ts';
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

  if (!next.shipping_profiles.some(p => p.name === FEYA_EUR_BASE_PROFILE_NAME && p.currency === 'EUR')) {
    const one = next.shipping_profiles.length === 1 ? next.shipping_profiles[0] : null;
    const emptyPlaceholder = one && one.currency === 'EUR'
      && next.default_shipping_profile_id === null
      && next.assignments.every(a => a.shipping_profile_id === null)
      && one.served_countries.length === 0 && one.max_units_per_parcel === null
      && one.rules.length === 1 && one.rules[0].scope === 'default'
      && one.rules[0].countries.length === 0
      && (!one.rules[0].standard || (one.rules[0].standard.amount_minor === null && one.rules[0].standard.transit === null))
      && (!one.rules[0].express || (one.rules[0].express.amount_minor === null && one.rules[0].express.transit === null));

    if (emptyPlaceholder) {
      // Reuse the only already-saved placeholder IDs, rather than creating a
      // confusing second "Standard" shipping profile beside the empty one.
      const preview = addOwnerConfirmedEurDraft({
        ...next, shipping_profiles: [], default_shipping_profile_id: null,
      }, generateId).shipping_profiles[0];
      const adopted: DraftShippingProfile = {
        ...preview, id: one.id,
        rules: preview.rules.map((rule, index) => ({ ...rule, id: index === 0 ? one.rules[0].id : rule.id })),
      };
      next = { ...next, shipping_profiles: [adopted], default_shipping_profile_id: adopted.id };
    } else {
      next = addOwnerConfirmedEurDraft(next, generateId);
    }
  }

  next = addOwnerApprovedRemoteZoneToEurDraft(next, generateId);
  const regular = next.shipping_profiles.find(p => p.name === FEYA_EUR_BASE_PROFILE_NAME && p.currency === 'EUR');
  if (regular && next.default_shipping_profile_id === null) {
    next = { ...next, default_shipping_profile_id: regular.id };
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
