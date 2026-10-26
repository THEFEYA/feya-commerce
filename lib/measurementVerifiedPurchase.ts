import type {OwnerCartPreviewItem} from './commerceOwnerCartReview.ts';
import type {FeyaMeasurementItem} from './measurementContract.ts';

export type PaidOrderReceipt = {
  order_number?:unknown;
  kind?:unknown;
  status?:unknown;
  currency?:unknown;
  total_minor?:unknown;
  merchandise_minor?:unknown;
  lines?:unknown;
};

export type VerifiedPurchaseMeasurement = {
  transactionId:string;
  receiptId:string;
  currency:'EUR';
  value:number;
  items:FeyaMeasurementItem[];
};

const validMinor=(x:unknown):x is number=>typeof x==='number'&&Number.isSafeInteger(x)&&x>=0;
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function obj(value:unknown):value is Record<string,unknown>{
  return value!==null && typeof value==='object' && !Array.isArray(value);
}

/** Build a GA4 purchase ONLY from a real customer PAID receipt, matching the
 * exact checkout-time bag. The order total is supplied by trusted server data,
 * never by an attacker-controlled HTML price or PaymentIntent redirect.
 * We skip attribution if a shopper changed/switched browsers before returning.
 * No buyer name, email, address, PayPal ID or access token enters analytics.
 */
export function verifiedPurchaseFromReceipt(
  receipt:PaidOrderReceipt, checkoutBag:readonly OwnerCartPreviewItem[],
):VerifiedPurchaseMeasurement|null{
  if(receipt.kind!=='customer'||receipt.status!=='paid'||receipt.currency!=='EUR')return null;
  if(typeof receipt.order_number!=='string'||!/^FEYA-[A-Za-z0-9-]{1,90}$/.test(receipt.order_number))return null;
  if(!validMinor(receipt.total_minor)||receipt.total_minor<=0
    ||!validMinor(receipt.merchandise_minor)||receipt.merchandise_minor<=0
    ||receipt.total_minor<receipt.merchandise_minor)return null;
  if(!Array.isArray(receipt.lines)||receipt.lines.length===0||receipt.lines.length!==checkoutBag.length)return null;

  let merchandise=0;
  const items:FeyaMeasurementItem[]=[];
  for(let i=0;i<checkoutBag.length;i++){
    const bag=checkoutBag[i],line:unknown=receipt.lines[i];
    if(!obj(line)||!uuid.test(bag.canonical_product_id)||!bag.configuration_id||
      !uuid.test(bag.configuration_id)||!validMinor(line.line_minor)||
      typeof line.quantity!=='number'||!Number.isSafeInteger(line.quantity)
      ||line.quantity!==bag.qty||!Number.isSafeInteger(bag.qty)||bag.qty<=0)return null;
    const unitMinor=Math.round(bag.price*100);
    if(!Number.isSafeInteger(unitMinor)||unitMinor<=0||line.line_minor!==unitMinor*bag.qty)return null;
    merchandise+=line.line_minor;
    items.push({
      canonical_product_id:bag.canonical_product_id,
      sku_id:bag.configuration_id,
      quantity:bag.qty,
      item_price:unitMinor/100,
      item_value:line.line_minor/100,
      currency:'EUR',
    });
  }
  if(merchandise!==receipt.merchandise_minor)return null;
  return{
    transactionId:receipt.order_number,
    receiptId:receipt.order_number,
    currency:'EUR',
    value:receipt.total_minor/100,
    items,
  };
}
