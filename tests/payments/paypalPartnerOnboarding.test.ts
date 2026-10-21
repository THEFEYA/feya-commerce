import test from 'node:test';
import assert from 'node:assert/strict';
import {
  partnerSettings,createPartnerOnboardingLink,verifyPartnerOnboardingWithPayPal,
  PartnerConnectError,type PartnerConfig,
} from '../../lib/payments/paypalPartnerOnboarding.ts';
import {readFileSync} from 'node:fs';
const id='526b38d0-2ad5-48b3-b216-24c21af45d3d';
const merchant='5VT3RDX64P5Z6';
const config:PartnerConfig={
 clientId:'A'.repeat(40),clientSecret:'S'.repeat(50),
 partnerMerchantId:'ABCDEFGHIJKLM',bnCode:'FEYA_BN',
 environment:'sandbox',
};
const success={
  merchant_id:merchant,tracking_id:id,payments_receivable:true,
  primary_email_confirmed:true,
  oauth_integrations:[{
    integration_type:'OAUTH_THIRD_PARTY',
    integration_method:'PAYPAL',
    oauth_third_party:[{partner_client_id:config.clientId,
      scopes:[
        'https://uri.paypal.com/services/payments/payment/authcapture',
        'https://uri.paypal.com/services/payments/refund',
      ],
    }],
  }],
};
function transport(opts:{merchant?:Record<string,unknown>;url?:string;tokenStatus?:number}={}):typeof fetch{
 return async(input,init)=>{
  const url=String(input);
  if(url.endsWith('/v1/oauth2/token')){
   if(opts.tokenStatus)return new Response(JSON.stringify({name:'NOT_AUTHORIZED'}),{status:opts.tokenStatus});
   return new Response(JSON.stringify({access_token:'paypal-fake-sandbox-access-token',expires_in:1800,token_type:'Bearer',app_id:'APP-FAKE'}),{status:200});
  }
  if(url.endsWith('/v2/customer/partner-referrals')){
   assert.equal(init?.method,'POST');
   assert.equal((init?.headers as Record<string,string>)?.['PayPal-Partner-Attribution-Id'],config.bnCode);
   const body=JSON.parse(String(init?.body));
   assert.equal(body.tracking_id,id);
   assert.equal(body.operations[0].api_integration_preference.rest_api_integration.integration_type,'THIRD_PARTY');
   assert.deepEqual(body.operations[0].api_integration_preference.rest_api_integration.third_party_details.features,['PAYMENT','REFUND']);
   assert.equal(body.partner_config_override.return_url,'https://thefeya.com/partner/seller-online');
   return new Response(JSON.stringify({links:[{rel:'action_url',href:opts.url||'https://www.sandbox.paypal.com/us/merchantsignup/partner/onboardingentry?token=FAKE'}]}),{status:201});
  }
  if(url.includes('/merchant-integrations/')){
   assert.ok(url.includes(config.partnerMerchantId));
   return new Response(JSON.stringify(opts.merchant||success),{status:200});
  }
  throw Error('unexpected endpoint: '+url);
 };
}

test('official PayPal redirect available only with approved partner and server credentials',()=>{
 const env={
  FEYA_PAYPAL_PARTNER_REFERRALS_ENABLED:'true',
  FEYA_PAYPAL_PARTNER_APPROVED:'true',
  VERCEL_ENV:'production',
  VERCEL_PROJECT_ID:'prj_ePIymo4sUG33wrRjHBxWrSlaxPID',
  FEYA_PAYPAL_PARTNER_CLIENT_ID:config.clientId,
  FEYA_PAYPAL_PARTNER_CLIENT_SECRET:config.clientSecret,
  FEYA_PAYPAL_PARTNER_MERCHANT_ID:config.partnerMerchantId,
  FEYA_PAYPAL_PARTNER_BN_CODE:config.bnCode,
  FEYA_PAYPAL_PARTNER_ENVIRONMENT:'sandbox',
 };
 assert.equal(partnerSettings({...env,FEYA_PAYPAL_PARTNER_APPROVED:'false'}),null);
 assert.equal(partnerSettings({...env,VERCEL_ENV:'preview'}),null);
 assert.equal(partnerSettings({...env,FEYA_PAYPAL_PARTNER_CLIENT_SECRET:undefined}),null);
 assert.equal(partnerSettings(env)?.environment,'sandbox');
});

test('creates actual PayPal Partner Referrals link, not a fabricated OAuth URL',async()=>{
 const out=await createPartnerOnboardingLink(config,id,transport());
 assert.ok(out.actionUrl.startsWith('https://www.sandbox.paypal.com/'));
 assert.equal(out.trackingId,id);
 await assert.rejects(()=>createPartnerOnboardingLink(config,id,transport({url:'https://evil.test/collect-secrets'})),
  (e:unknown)=>e instanceof PartnerConnectError&&e.code==='partner_bad_response');
});

test('return URL alone is not trusted: merchant status comes from authenticated PayPal API',async()=>{
 const r=await verifyPartnerOnboardingWithPayPal(config,id,merchant,transport());
 assert.equal(r.paymentPermission,true);
 assert.equal(r.refundPermission,true);
 assert.equal(r.paymentsReceivable,true);
 await assert.rejects(()=>verifyPartnerOnboardingWithPayPal(config,id,merchant,
   transport({merchant:{...success,tracking_id:'bad'}})),
   (e:unknown)=>e instanceof PartnerConnectError&&e.code==='partner_permission_not_granted');
 await assert.rejects(()=>verifyPartnerOnboardingWithPayPal(config,id,merchant,
   transport({merchant:{...success,payments_receivable:false}})),
   (e:unknown)=>e instanceof PartnerConnectError&&e.code==='partner_permission_not_granted');
 await assert.rejects(()=>verifyPartnerOnboardingWithPayPal(config,id,merchant,
   transport({merchant:{...success,oauth_integrations:[]}})),
   (e:unknown)=>e instanceof PartnerConnectError&&e.code==='partner_permission_not_granted');
});

test('partner not approved cannot use link or accept merchant onboarding',async()=>{
 await assert.rejects(()=>createPartnerOnboardingLink(config,id,transport({tokenStatus:403})),
   (e:unknown)=>e instanceof PartnerConnectError&&e.code==='partner_not_approved');
 assert.equal(readFileSync('lib/payments/paypalPartnerOnboardingServer.ts','utf8').includes('verified: true'),false);
 const route=readFileSync('app/api/partner/seller-online/paypal-connect/route.ts','utf8');
 assert.ok(route.includes('resolveInstaller(req)'));
 assert.ok(route.includes('sameOrigin(req)'));
 assert.ok(!route.includes('FEYA_COMMERCE_PAID_CHECKOUT_RELEASE_APPROVED=true'));
 assert.ok(!route.includes('paymentsStore.setActive'));
 const sql=readFileSync('supabase/migrations/20261021221000_paypal_partner_onboarding_v1.sql','utf8');
 assert.ok(sql.includes("status<>'verified'"));
 assert.ok(sql.includes('enable row level security'));
 assert.ok(sql.includes('from public,anon,authenticated,service_role'));
});
