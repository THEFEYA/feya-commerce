import type { DeliveryWorkspaceDraft, DraftCalendar, DraftDuration } from './commerceDeliveryWorkspace.ts';

/** The owner-confirmed normal production/dispatch/transit policy is Monday-Friday.
 * Weekend work may only be introduced in a future separately priced priority
 * manufacturing service, never by a checkbox in ordinary delivery profiles.
 * Holidays remain explicitly editable and are not guessed. */
export const STANDARD_WORKING_DAYS = [1, 2, 3, 4, 5] as const;

export function standardWeekCalendar(existing: DraftCalendar | null): DraftCalendar {
  return { working_weekdays: [...STANDARD_WORKING_DAYS], holidays: existing?.holidays || [] };
}
function businessDays(value: DraftDuration | null): DraftDuration | null {
  return value ? { ...value, unit: 'business_days' } : null;
}

export function normalizeRegularDeliveryWorkingWeek(draft: DeliveryWorkspaceDraft): DeliveryWorkspaceDraft {
  return {
    ...draft,
    dispatch_calendar: standardWeekCalendar(draft.dispatch_calendar),
    production_profiles: draft.production_profiles.map(p => ({
      ...p, duration: businessDays(p.duration), calendar: standardWeekCalendar(p.calendar),
    })),
    shipping_profiles: draft.shipping_profiles.map(p => ({
      ...p,
      rules: p.rules.map(r => ({
        ...r,
        standard: r.standard ? { ...r.standard, transit: businessDays(r.standard.transit),
          calendar: standardWeekCalendar(r.standard.calendar) } : null,
        express: r.express ? { ...r.express, transit: businessDays(r.express.transit),
          calendar: standardWeekCalendar(r.express.calendar) } : null,
      })),
    })),
  };
}


/** Supabase JSONB returns sorted object keys and can differ from JSX draft
 * insertion order. A key-order-sensitive JSON.stringify would incorrectly
 * mark an actually saved revision "unsaved" and block date preview/approval. */
export function equivalentDeliveryWorkspaceDraft(a: DeliveryWorkspaceDraft, b: DeliveryWorkspaceDraft): boolean {
  const stable = (value: unknown) => JSON.stringify(value, (_key, current: unknown) => {
    if (!current || typeof current !== 'object' || Array.isArray(current)) return current;
    return Object.fromEntries(Object.entries(current).sort(([left], [right]) => left.localeCompare(right)));
  });
  return stable(a) === stable(b);
}
