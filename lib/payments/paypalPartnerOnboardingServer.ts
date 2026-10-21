import 'server-only';
import {createHash,randomUUID} from 'node:crypto';
import {getSupabaseServiceRoleClient} from '@/lib/supabaseAdmin';
import type {PaymentsActor} from './access.ts';
import {
  partnerSettings,createPartnerOnboardingLink,verifyPartnerOnboardingWithPayPal,
  PartnerConnectError,
} from './paypalPartnerOnboarding.ts';

type Row={
  tracking_id:string;initiated_by_grant_id:string|null;
  environment:'live'|'sandbox';client_id_hash:string;
  status:'created'|'awaiting_consent'|'verified'|'rejected';
  expires_at:string;verified_at:string|null;
  merchant_id:string|null;
};
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MERCHANT=/^[A-Za-z0-9]{10,32}$/;
const digest=(x:string)=>createHash('sha256').update(x).digest('hex');
const fail=(code:string):never=>{throw new PartnerConnectError(
  code as 'partner_request_rejected'
);}
function db(){
  const value=getSupabaseServiceRoleClient();
  if(!value)throw new PartnerConnectError('partner_provider_unavailable');
  // Supabase's generated PostgREST types only enumerate schema objects from
  // the previous release. This new table is migration-gated and validated at
  // runtime rather than recursing into an outdated schema type graph.
  return value as unknown as {from:(name:string)=>any};
}
function withActor<T extends {eq:(field:string,value:string)=>T;is:(field:string,value:null)=>T}>(
  query:T,actor:PaymentsActor,
):T{
  return actor.grantId?query.eq('initiated_by_grant_id',actor.grantId)
    :query.is('initiated_by_grant_id',null);
}
export async function getPartnerOnboardingStatus(actor:PaymentsActor){
  const config=partnerSettings();
  const client=db();
  const query=withActor(client.from('feya_pay_partner_onboarding_v1')
    .select('tracking_id,environment,status,merchant_id,verified_at,created_at')
    .order('created_at',{ascending:false}).limit(1),actor);
  const {data,error}=await query;
  if(error)throw new PartnerConnectError('partner_provider_unavailable');
  const latest=data?.[0]||null;
  return {
    available:config!==null,
    environment:config?.environment||null,
    last:latest?{
      status:latest.status,environment:latest.environment,
      verified_at:latest.verified_at||null,
      // This is historical PayPal verification, not live settlement readiness.
      authorizationVerified:latest.status==='verified',
    }:null,
    checkoutEnabledByThisFlow:false,
  };
}
export async function startPartnerOnboarding(actor:PaymentsActor){
  const config=partnerSettings();
  if(!config)throw new PartnerConnectError('partner_not_approved');
  const client=db();
  const match=withActor(client.from('feya_pay_partner_onboarding_v1')
    .select('tracking_id')
    .gte('created_at',new Date(Date.now()-60*60*1000).toISOString()),actor);
  const {data:recent,error:readError}=await match;
  if(readError)throw new PartnerConnectError('partner_provider_unavailable');
  if((recent||[]).length>=3)fail('rate_limited');
  const trackingId=randomUUID();
  const clientHash=digest(config.environment+':'+config.clientId);
  const {error}=await client.from('feya_pay_partner_onboarding_v1').insert({
    tracking_id:trackingId,initiated_by_grant_id:actor.grantId,
    environment:config.environment,client_id_hash:clientHash,
    expires_at:new Date(Date.now()+48*60*60*1000).toISOString(),
  });
  if(error)throw new PartnerConnectError('partner_provider_unavailable');
  const link=await createPartnerOnboardingLink(config,trackingId);
  const update=withActor(client.from('feya_pay_partner_onboarding_v1')
    .update({status:'awaiting_consent',updated_at:new Date().toISOString()})
    .eq('tracking_id',trackingId),actor);
  const {error:updatedError}=await update;
  if(updatedError)throw new PartnerConnectError('partner_provider_unavailable');
  return {url:link.actionUrl};
}
export async function completePartnerOnboarding(actor:PaymentsActor,raw:unknown){
  const input=raw&&typeof raw==='object'&&!Array.isArray(raw)
    ?raw as Record<string,unknown>:{};
  if(typeof input.tracking_id!=='string'||!UUID.test(input.tracking_id)
     ||typeof input.merchant_id!=='string'||!MERCHANT.test(input.merchant_id))
    fail('invalid_callback');
  const config=partnerSettings();
  if(!config)throw new PartnerConnectError('partner_not_approved');
  const client=db();
  const query=withActor(client.from('feya_pay_partner_onboarding_v1')
    .select('tracking_id,initiated_by_grant_id,environment,status,client_id_hash,expires_at,verified_at,merchant_id')
    .eq('tracking_id',input.tracking_id).limit(1),actor);
  const {data,error}=await query;
  const row=(data||[])[0] as Row|undefined;
  if(error)throw new PartnerConnectError('partner_provider_unavailable');
  if(!row||Date.parse(row.expires_at)<=Date.now()
     ||row.environment!==config.environment
     ||row.client_id_hash!==digest(config.environment+':'+config.clientId)
     ||!['awaiting_consent','verified'].includes(row.status))
    fail('invalid_or_expired_attempt');
  if(row.status==='verified'&&row.merchant_id!==input.merchant_id)fail('merchant_mismatch');
  // A forged return_url is never enough. Require PayPal's signed-in seller
  // consent and account readiness over the authenticated PayPal REST API.
  const verified=await verifyPartnerOnboardingWithPayPal(
    config,row.tracking_id,input.merchant_id);
  const update=withActor(client.from('feya_pay_partner_onboarding_v1')
    .update({
      status:'verified',merchant_id:verified.merchantId,
      payments_receivable:true,primary_email_confirmed:true,
      payment_permission:true,refund_permission:true,
      verified_at:new Date().toISOString(),updated_at:new Date().toISOString(),
    }).eq('tracking_id',row.tracking_id),actor);
  const {error:saveError}=await update;
  if(saveError)throw new PartnerConnectError('partner_provider_unavailable');
  return {verified:true,checkout_enabled:false};
}
