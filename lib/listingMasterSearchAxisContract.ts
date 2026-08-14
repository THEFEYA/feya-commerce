import {
  sellableOfferAllowsComponentFocus,
  type StorefrontSellableOfferTruth,
} from './storefrontSellableOffer.ts';

export const LISTING_MASTER_SEARCH_AXIS_CONTRACT = 'seo_search_axes_v1';

type FocusRecord = Record<string, unknown>;

export type ListingMasterComponentAxisPartition = {
  selected: string[];
  sellableComponentAxes: string[];
  searchOnlyComponentAxes: string[];
};

export type ListingMasterFocusReconciliation = ListingMasterComponentAxisPartition & {
  focus: FocusRecord;
  removedComponents: string[];
  usesSearchAxisContract: boolean;
};

/**
 * Listing Master component chips serve two different purposes:
 *
 * - selector-backed axes describe current sellable components;
 * - search-only axes describe an operator-confirmed product type or body
 *   placement used to retrieve keyword candidates.
 *
 * The second group must never be written into canonical composition or used by
 * What's Included. Keeping the partition explicit prevents an SEO search axis
 * such as `top` or `shoulders` from manufacturing a sellable option.
 */
export function partitionListingMasterComponentAxes(
  selectedComponents: unknown,
  offer: StorefrontSellableOfferTruth | null | undefined,
): ListingMasterComponentAxisPartition {
  const selected = stringArray(selectedComponents);
  if (!offer || offer.status !== 'ready') {
    return {
      selected,
      sellableComponentAxes: [],
      searchOnlyComponentAxes: selected,
    };
  }

  const sellableComponentAxes = selected.filter((component) => (
    sellableOfferAllowsComponentFocus(offer, component)
  ));
  const searchOnlyComponentAxes = selected.filter((component) => (
    !sellableOfferAllowsComponentFocus(offer, component)
  ));

  return {
    selected,
    sellableComponentAxes,
    searchOnlyComponentAxes,
  };
}

/**
 * Versioned compatibility boundary for saved decisions.
 *
 * Legacy decisions treated every selected chip as a composition assertion, so
 * unsupported chips must still fail closed until the owner re-saves them.
 * Decisions saved under `seo_search_axes_v1` retain search-only axes for
 * retrieval while the exact storefront selector remains composition truth.
 */
export function reconcileListingMasterComponentFocus(
  focusValue: unknown,
  offer: StorefrontSellableOfferTruth | null | undefined,
): ListingMasterFocusReconciliation {
  const focus = isRecord(focusValue) ? focusValue : {};
  const partition = partitionListingMasterComponentAxes(focus.component, offer);
  const usesSearchAxisContract = String(focus.component_focus_contract || '').trim()
    === LISTING_MASTER_SEARCH_AXIS_CONTRACT;

  return {
    ...partition,
    focus: {
      ...focus,
      component: usesSearchAxisContract
        ? partition.selected
        : partition.sellableComponentAxes,
    },
    removedComponents: usesSearchAxisContract
      ? []
      : partition.searchOnlyComponentAxes,
    usesSearchAxisContract,
  };
}

/**
 * Returns the only component axes that may enter writer-visible factual focus.
 * The complete SEO search-axis selection remains stored separately.
 */
export function writerComponentAxesFromListingMasterFocus(focusValue: unknown) {
  const focus = isRecord(focusValue) ? focusValue : {};
  const usesSearchAxisContract = String(focus.component_focus_contract || '').trim()
    === LISTING_MASTER_SEARCH_AXIS_CONTRACT;
  return stringArray(
    usesSearchAxisContract ? focus.sellable_component_axes : focus.component,
  );
}

function stringArray(value: unknown) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  const normalized = values
    .flatMap((item) => String(item || '').split(','))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set(normalized)];
}

function isRecord(value: unknown): value is FocusRecord {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
