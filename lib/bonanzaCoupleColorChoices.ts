import type {StorefrontProduct} from './types.ts';
import {colorChoiceLabel,PHOTOGRAPHED_MIXED_COUPLE_COLORS} from './bonanzaColorChoices.ts';

/**
 * Five exact source-matched two-person products. Both outfits may be ordered
 * together or separately as already resolved by approved configuration rows.
 * These are *color selections*, not generated price rows or payable variants.
 */
export const COUPLE_LISTING_IDS = [
  '057fbd51-52f5-4404-b126-e5d75b8599f4',
  'f012a88f-44db-4e17-ba57-7f60bb7b5719',
  'a759b44e-1329-47a6-a444-0c9feabcc0ce',
  'fefd1c3e-2fd1-47c9-970f-c30962c1a737',
  '5bf3df64-84dc-4baf-84bd-8a94e1b06ccb',
] as const;
const COUPLES = new Set<string>(COUPLE_LISTING_IDS);

export type PartnerColorPair = {women:string;men:string};
export function coupleColorSelection(product:StorefrontProduct): {
  available:string[];
  defaultPair:PartnerColorPair;
} | null {
  if(!COUPLES.has(product.canonical_product_id)||!product.color_choices?.length
    ||!product.default_color_choice||!product.color_choices.includes(product.default_color_choice))return null;
  const available=product.color_choices;
  const base=product.default_color_choice;
  const special=PHOTOGRAPHED_MIXED_COUPLE_COLORS[product.canonical_product_id as keyof typeof PHOTOGRAPHED_MIXED_COUPLE_COLORS];
  const proposed=special && available.includes(special.women) && available.includes(special.men)
    ? special : {women:base,men:base};
  return {available,defaultPair:{women:proposed.women,men:proposed.men}};
}

export function couplePairLabel(pair:PartnerColorPair):string {
  return "Women's " + colorChoiceLabel(pair.women) + " · Men's " + colorChoiceLabel(pair.men);
}
