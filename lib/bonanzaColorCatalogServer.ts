import 'server-only';

import reviewed from '@/config/bonanzaReviewedColors20261011.json';
import overrides from '@/config/bonanzaColorDisplayOverrides.json';
import { enrichStorefrontProductColors, colorChoiceLabel, constituentColors, type OwnerColorChoices } from '@/lib/bonanzaColorChoices';
import {isColorPriceException,verifiedColorPriceRows} from '@/lib/bonanzaColorPriceExceptions';
import type {StorefrontConfiguration} from '@/lib/types';
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
  let decision: OwnerColorChoices = override ? {...original,...override,held:false} : original;
  // Three exact owner-approved source products price by Brown/Black/Green.
  // Bonanza's color suggestions also contained an unpriced White on two of
  // them. Expose ONLY variants backed by real immutable checkout price rows.
  // Do not change any source/owner decision or invent an online White price.
  if (isColorPriceException(product.canonical_product_id)) {
    const rows=verifiedColorPriceRows(
      product.canonical_product_id,
      Array.isArray(product.configurations) ? product.configurations as StorefrontConfiguration[] : [],
    );
    if (!rows || !rows.length) throw new Error('COLOR_PRICE_SOURCE_UNVERIFIED');
    const priceBacked=new Set(rows.map(row=>String(row.configuration_color||'').toLowerCase()));
    const validCodes=decision.colors.filter(code=>priceBacked.has(colorChoiceLabel(code).toLowerCase()));
    if (validCodes.length!==rows.length) throw new Error('COLOR_PRICE_SOURCE_MISMATCH');
    const allowed=new Set(constituentColors(validCodes));
    const requested=override?.filter_colors??constituentColors(validCodes);
    decision={
      ...decision,colors:validCodes,
      primary:decision.primary&&validCodes.includes(decision.primary)?decision.primary:validCodes[0],
      filter_colors:requested.filter(color=>allowed.has(color)),
    };
  }
  return enrichStorefrontProductColors(product, decision);
}
