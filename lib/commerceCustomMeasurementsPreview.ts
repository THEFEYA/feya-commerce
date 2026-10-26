/**
 * Owner-only, PREPAYMENT visual service contract. Not a payable offer, not a
 * new configuration or price-row authority. Seller Online must receive the
 * validated service line from the future server quote before real checkout.
 */
export const CUSTOM_MEASUREMENTS_PREVIEW_EUR_MINOR=1500 as const;
export type CustomMeasurementSizes={
  size?:string|null;
  womens_size?:string|null;
  mens_size?:string|null;
};
const selected=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;

export function customMeasurementRequiredCount(value:CustomMeasurementSizes):number{
  // A partner can select Custom before the other partner selects any size.
  // Reflect that provisional service immediately; checkout still needs both.
  const pair=selected(value.womens_size)||selected(value.mens_size);
  if(pair)return Number(value.womens_size==='Custom')+Number(value.mens_size==='Custom');
  return value.size==='Custom'?1:0;
}

/** Optional addon for a standard-size order, but Custom-size orders must not
 * be allowed to enter a real checkout with their required addon switched off.
 */
export function customMeasurementUnitsPerPurchase(value:CustomMeasurementSizes):number{
  const required=customMeasurementRequiredCount(value);
  if(required)return required;
  return selected(value.womens_size)&&selected(value.mens_size)?2:1;
}

export function customMeasurementLineMinor(
  value:CustomMeasurementSizes & {qty:number},
  enabled:boolean,
):number{
  if(!enabled)return 0;
  if(!Number.isSafeInteger(value.qty)||value.qty<1||value.qty>100)
    throw new Error('custom_measurements_quantity_invalid');
  return CUSTOM_MEASUREMENTS_PREVIEW_EUR_MINOR*customMeasurementUnitsPerPurchase(value)*value.qty;
}

export function customMeasurementSelectionNeedsReview(
  value:CustomMeasurementSizes,
  enabled:boolean,
):boolean{
  return customMeasurementRequiredCount(value)>0&&!enabled;
}
