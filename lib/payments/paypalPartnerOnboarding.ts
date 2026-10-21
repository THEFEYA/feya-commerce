import {PayPalClient,PayPalApiError,PayPalNetworkError} from './paypalRest.ts';

/**
 * Official PayPal Partner Referrals (not "Log in with PayPal", which authenticates
 * a person but does not grant payment-processing permissions).
 *
 * Requires an approved PayPal platform / partner app. Never requests the Seller
 * Online password, Client Secret, card data, or OAuth tokens from a technician.
 * The only redirect target is an action_url returned by the real PayPal API.
 */
export type PartnerEnvironment='sandbox'|'live';
export type PartnerConfig={
  clientId:string;clientSecret:string;partnerMerchantId:string;
  bnCode:string;environment:PartnerEnvironment;
};
export type PartnerReferral={actionUrl:string;trackingId:string};
export type VerifiedPartnerMerchant={
  merchantId:string;trackingId:string;environment:PartnerEnvironment;
  paymentsReceivable:true;emailConfirmed:true;paymentPermission:true;refundPermission:true;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MERCHANT=/^[A-Za-z0-9]{10,32}$/;
const CLIENT=/^[A-Za-z0-9_-]{20,200}$/;
const BN=/^[A-Za-z0-9_.-]{1,100}$/;
const BASE={
  sandbox:'https://api-m.sandbox.paypal.com',
  live:'https://api-m.paypal.com',
} as const;
const RETURN_URL='https://thefeya.com/partner/seller-online';
export function partnerSettings(env:Record<string,string|undefined>=process.env):PartnerConfig|null{
  if(env.FEYA_PAYPAL_PARTNER_REFERRALS_ENABLED!=='true'
     ||env.FEYA_PAYPAL_PARTNER_APPROVED!=='true'
     ||env.VERCEL_ENV!=='production'
     ||env.VERCEL_PROJECT_ID!=='prj_ePIymo4sUG33wrRjHBxWrSlaxPID')return null;
  const clientId=env.FEYA_PAYPAL_PARTNER_CLIENT_ID||'';
  const clientSecret=env.FEYA_PAYPAL_PARTNER_CLIENT_SECRET||'';
  const partnerMerchantId=env.FEYA_PAYPAL_PARTNER_MERCHANT_ID||'';
  const bnCode=env.FEYA_PAYPAL_PARTNER_BN_CODE||'';
  const environment=env.FEYA_PAYPAL_PARTNER_ENVIRONMENT==='sandbox'?'sandbox':'live';
  return CLIENT.test(clientId)&&clientSecret.length>=20
    &&clientSecret.length<=400&&MERCHANT.test(partnerMerchantId)&&BN.test(bnCode)
    ?{clientId,clientSecret,partnerMerchantId,bnCode,environment}:null;
}
function safePayPalOnboardingUrl(value:unknown,environment:PartnerEnvironment):string|null{
  if(typeof value!=='string'||value.length>1600)return null;
  try{
    const url=new URL(value);
    const expected=environment==='live'?'www.paypal.com':'www.sandbox.paypal.com';
    return url.protocol==='https:'&&url.hostname===expected
      &&!url.username&&!url.password&&url.pathname.length>2
      ?url.href:null;
  }catch{return null;}
}
async function token(config:PartnerConfig,fetcher:typeof fetch):Promise<string>{
  const paypal=new PayPalClient({
    clientId:config.clientId,clientSecret:config.clientSecret,
    environment:config.environment,
  },fetcher);
  try{
    const result=await paypal.accessToken(true);
    return result.token;
  }catch(e){
    if(e instanceof PayPalNetworkError)throw new PartnerConnectError('partner_provider_unavailable');
    if(e instanceof PayPalApiError&&(e.info.status===401||e.info.status===403))
      throw new PartnerConnectError('partner_not_approved');
    throw new PartnerConnectError('partner_request_rejected');
  }
}
export class PartnerConnectError extends Error{
  readonly code:
    'partner_not_approved'|'partner_provider_unavailable'|'partner_request_rejected'
    |'partner_bad_response'|'partner_permission_not_granted';
  constructor(code:PartnerConnectError['code']){
    super(code);
    this.code=code;
  }
}
function asRecord(x:unknown):Record<string,unknown>{
  return x&&typeof x==='object'&&!Array.isArray(x)?x as Record<string,unknown>:{};
}
async function paypalJson(
  config:PartnerConfig,access:string,path:string,method:'POST'|'GET',
  fetcher:typeof fetch,payload?:unknown
):Promise<unknown>{
  let response:Response;
  try{
    response=await fetcher(BASE[config.environment]+path,{
      method,redirect:'error',cache:'no-store',signal:AbortSignal.timeout(12000),
      headers:{
        Authorization:'Bearer '+access,
        'PayPal-Partner-Attribution-Id':config.bnCode,
        'Content-Type':'application/json',
        Accept:'application/json',
      },
      ...(payload!==undefined?{body:JSON.stringify(payload)}:{}),
    });
  }catch{throw new PartnerConnectError('partner_provider_unavailable');}
  if(response.status===401||response.status===403)throw new PartnerConnectError('partner_not_approved');
  if(!response.ok)throw new PartnerConnectError('partner_request_rejected');
  try{return await response.json();}
  catch{throw new PartnerConnectError('partner_bad_response');}
}
export async function createPartnerOnboardingLink(
  config:PartnerConfig,trackingId:string,fetcher:typeof fetch=fetch
):Promise<PartnerReferral>{
  if(!UUID.test(trackingId))throw new PartnerConnectError('partner_request_rejected');
  const access=await token(config,fetcher);
  const payload={
    tracking_id:trackingId,
    operations:[{
      operation:'API_INTEGRATION',
      api_integration_preference:{rest_api_integration:{
        integration_method:'PAYPAL',
        integration_type:'THIRD_PARTY',
        third_party_details:{features:['PAYMENT','REFUND']},
      }},
    }],
    products:['EXPRESS_CHECKOUT'],
    partner_config_override:{
      return_url:RETURN_URL,
      return_url_description:'Return to TheFEYA Seller Online connection',
    },
    legal_consents:[{type:'SHARE_DATA_CONSENT',granted:true}],
  };
  const response=asRecord(await paypalJson(config,access,
    '/v2/customer/partner-referrals','POST',fetcher,payload));
  const links=Array.isArray(response.links)?response.links:[];
  const action=links.map(asRecord).find(link=>link.rel==='action_url');
  const actionUrl=safePayPalOnboardingUrl(action?.href,config.environment);
  if(!actionUrl)throw new PartnerConnectError('partner_bad_response');
  return {actionUrl,trackingId};
}
export async function verifyPartnerOnboardingWithPayPal(
  config:PartnerConfig,trackingId:string,merchantId:string,fetcher:typeof fetch=fetch
):Promise<VerifiedPartnerMerchant>{
  if(!UUID.test(trackingId)||!MERCHANT.test(merchantId))
    throw new PartnerConnectError('partner_request_rejected');
  const access=await token(config,fetcher);
  // Server-to-server evidence from PayPal, NOT unsigned query parameters.
  const path='/v1/customer/partners/'+encodeURIComponent(config.partnerMerchantId)
    +'/merchant-integrations/'+encodeURIComponent(merchantId);
  const result=asRecord(await paypalJson(config,access,path,'GET',fetcher));
  const oauth=Array.isArray(result.oauth_integrations)?result.oauth_integrations:[];
  const thirdParty=oauth.map(asRecord).flatMap(integration=>
    Array.isArray(integration.oauth_third_party)?integration.oauth_third_party.map(asRecord):[]
  );
  const approved=thirdParty.some(record=>{
    const scopes=Array.isArray(record.scopes)?record.scopes:[];
    return record.partner_client_id===config.clientId
      &&scopes.includes('https://uri.paypal.com/services/payments/payment/authcapture')
      &&scopes.includes('https://uri.paypal.com/services/payments/refund');
  });
  if(result.merchant_id!==merchantId||result.tracking_id!==trackingId
    ||result.payments_receivable!==true
    ||result.primary_email_confirmed!==true||!approved)
    throw new PartnerConnectError('partner_permission_not_granted');
  return {
    merchantId,trackingId,environment:config.environment,
    paymentsReceivable:true,emailConfirmed:true,paymentPermission:true,refundPermission:true,
  };
}
