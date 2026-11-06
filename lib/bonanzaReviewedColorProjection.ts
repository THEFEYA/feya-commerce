import reviewed from '../config/bonanzaReviewedColors20261011.json' with {type:'json'};
import overrides from '../config/bonanzaColorDisplayOverrides.json' with {type:'json'};
import { enrichStorefrontProductColors, colorChoiceLabel, constituentColors, type OwnerColorChoices } from './bonanzaColorChoices.ts';
import {isColorPriceException,verifiedColorPriceRows} from './bonanzaColorPriceExceptions.ts';
import type {StorefrontConfiguration} from './types.ts';
import type { StorefrontProduct } from './types.ts';

/**
 * Exact 207-row owner decision snapshot, not runtime Bonanza/owner-auth reads.
 * Embedding it in the server read model adds no source network trip, no
 * exposure of owner decisions, and no mutation of frozen product snapshots.
 * A held product uses its prior source until individually approved.
 */
const source = reviewed.products as Record<string, OwnerColorChoices>;

export function projectReviewedBonanzaColors(product: StorefrontProduct, mode: 'detail' | 'catalog' = 'detail'): StorefrontProduct {
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
    // Slim cards deliberately have no price tuples. Their color projection uses
    // the exact reviewed Brown/Black/Green source lane, never a payable quote.
    // Full detail and checkout retain the strict live 3-row price validation.
    const rows = mode === 'detail' ? verifiedColorPriceRows(
      product.canonical_product_id,
      Array.isArray(product.configurations) ? product.configurations as StorefrontConfiguration[] : [],
    ) : null;
    if (mode === 'detail' && (!rows || !rows.length)) throw new Error('COLOR_PRICE_SOURCE_UNVERIFIED');
    const priceBacked = new Set(rows
      ? rows.map(row=>String(row.configuration_color||'').toLowerCase())
      : ['brown','black','green']);
    const validCodes=decision.colors.filter(code=>priceBacked.has(colorChoiceLabel(code).toLowerCase()));
    if (validCodes.length!==3) throw new Error('COLOR_PRICE_SOURCE_MISMATCH');
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
