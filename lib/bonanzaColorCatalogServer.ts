import 'server-only';

import reviewed from '@/config/bonanzaReviewedColors20261011.json';
import overrides from '@/config/bonanzaColorDisplayOverrides.json';
import { enrichStorefrontProductColors, type OwnerColorChoices } from '@/lib/bonanzaColorChoices';
import type { StorefrontProduct } from '@/lib/types';

/**
 * Exact 207-row owner decision snapshot, not runtime Bonanza/owner-auth reads.
 * Embedding it in the server read model adds no source network trip, no
 * exposure of owner decisions, and no mutation of frozen product snapshots.
 * A held product uses its prior source until individually approved.
 */
const source = reviewed.products as Record<string, OwnerColorChoices>;

export function applyReviewedBonanzaColors(product: StorefrontProduct): StorefrontProduct {
  const original = source[product.canonical_product_id];
  if (!original) return product;
  // Only separately reviewed primary and base-color visibility may override the
  // preserved Bonanza choices. Versioned JSON is committed after owner export review.
  const override = (overrides.products as Record<string,{primary:string;filter_colors:string[];owner_review_hold_color_only?:boolean}>)[product.canonical_product_id];
  // Bonanza's marketplace HOLD remains intact. The owner separately confirmed
  // this specific Gold listing's site color; not a marketplace publication.
  if (original.held && (!override?.owner_review_hold_color_only
    || product.canonical_product_id !== 'ffbf1db6-6fae-4606-afbe-013415d6421d'
    || override.primary !== 'gold')) return product;
  return enrichStorefrontProductColors(product, override ? {...original,...override,held:false} : original);
}
