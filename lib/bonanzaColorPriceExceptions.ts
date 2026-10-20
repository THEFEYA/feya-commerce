import type {StorefrontConfiguration} from './types.ts';

/** Exact legacy 3-product / 9-price source lane. Color is the *price key* here,
 * unlike the rest of the Bonanza merchandising colors which are price-neutral.
 * These three products are color-priced already; a fourth White option from
 * Bonanza has no observed price and must NOT inherit a Brown/Black/Green quote.
 */
export const EXACT_COLOR_PRICE_PRODUCTS = [
  'de38a842-37c4-40a7-86b4-393341c4c9aa',
  '882793f6-15ca-4617-a579-5cd47290ce72',
  '7cf4ea37-cd11-4203-860c-7eed4ae965ba',
] as const;
const EXACT_IDS=new Set<string>(EXACT_COLOR_PRICE_PRODUCTS);
export function isColorPriceException(id:string){return EXACT_IDS.has(id);}

export function verifiedColorPriceRows(id:string,options:StorefrontConfiguration[]){
  if(!isColorPriceException(id))return null;
  if(options.length!==3||options.some(x=>
    !['Brown','Black','Green'].includes(String(x.configuration_color||''))
    ||!x.configuration_id
    ||!Number.isFinite(Number(x.display_price_amount))
    ||Number(x.display_price_amount)<=0
  ))return [] as StorefrontConfiguration[];
  const colors=new Set(options.map(x=>x.configuration_color));
  if(colors.size!==3)return [] as StorefrontConfiguration[];
  return options;
}
