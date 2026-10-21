/** Seller Online's documented WooCommerce/OpenCart PayPal Standard contract.
 * Pure data preparation only: never trusts browser totals or activates payment.
 * The customer is redirected to PayPal's hosted checkout, where payment card
 * inputs are handled by PayPal, not by TheFEYA.
 */
export type PreparedPayPalStandardOrder = {
  orderReference:string;
  approvedAmountMinor:number;
  currency:'EUR';
  itemTitle:string;
  recipientEmail:string;
  storeReference:string;
  environment:'sandbox'|'live';
};
export type PayPalStandardForm = {
  action:string;
  method:'POST';
  fields:Readonly<Record<string,string>>;
};
const EMAIL=/^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const ORDER=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const REFERENCE=/^[A-Za-z0-9:_-]{1,120}$/;
export function buildPayPalStandardForm(input:PreparedPayPalStandardOrder):PayPalStandardForm{
  if(!ORDER.test(input.orderReference)||
    !Number.isSafeInteger(input.approvedAmountMinor)||
    input.approvedAmountMinor<100||
    input.approvedAmountMinor>100000000||
    input.currency!=='EUR'||
    !EMAIL.test(input.recipientEmail)||
    !REFERENCE.test(input.storeReference)||
    !['sandbox','live'].includes(input.environment)||
    input.itemTitle.length<1||input.itemTitle.length>120){
    throw new Error('paypal_standard_order_not_authorized');
  }
  const action=input.environment==='live'
    ?'https://www.paypal.com/cgi-bin/webscr'
    :'https://www.sandbox.paypal.com/cgi-bin/webscr';
  return {
    action,method:'POST',
    fields:{
      cmd:'_xclick',
      business:input.recipientEmail,
      currency_code:'EUR',
      amount:(input.approvedAmountMinor/100).toFixed(2),
      item_name:input.itemTitle,
      invoice:input.orderReference,
      custom:input.orderReference+';opencart:'+input.storeReference,
      notify_url:'https://thefeya.com/api/commerce/paypal/ipn',
      return:'https://thefeya.com/checkout/return',
      cancel_return:'https://thefeya.com/cart',
      no_note:'1',
    }
  };
}
export type VerifiedPayPalIpn={
  txnId:string;
  invoice:string;
  grossMinor:number;
  currency:'EUR';
  receiver:string;
  paymentStatus:'Completed';
  custom:string;
};
/** Only call AFTER PayPal reports VERIFIED for the exact raw IPN postback.
 * Completed must also be matched to a real, current immutable FEYA order
 * and txn ID deduplicated before any paid-state transition.
 */
export function parseVerifiedPayPalIpn(
  ipn:Readonly<Record<string,string>>,
  expected:{orderReference:string;grossMinor:number;receiverEmail:string;custom:string}
):VerifiedPayPalIpn{
  const amount=ipn.mc_gross;
  const validAmount=typeof amount==='string'&&/^(0|[1-9]\d{0,7})\.\d{2}$/.test(amount)
    ?Math.round(Number(amount)*100):null;
  if(!ipn.txn_id||!REFERENCE.test(ipn.txn_id)||
    ipn.payment_status!=='Completed'||
    ipn.mc_currency!=='EUR'||
    ipn.invoice!==expected.orderReference||
    ipn.custom!==expected.custom||
    !ipn.receiver_email||
    ipn.receiver_email.toLowerCase()!==expected.receiverEmail.toLowerCase()||
    validAmount===null||
    validAmount!==expected.grossMinor){
    throw new Error('paypal_standard_ipn_mismatch');
  }
  return {
    txnId:ipn.txn_id,invoice:ipn.invoice,grossMinor:validAmount,
    currency:'EUR',receiver:ipn.receiver_email,
    paymentStatus:'Completed',custom:ipn.custom
  };
}
