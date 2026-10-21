import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  SELLER_ONLINE_OFFICIAL_LINKS,
  sellerOnlineSetupProgress,
} from '../../lib/sellerOnlineOfficialSetupGuide.ts';

const ui=readFileSync('components/SellerOnlinePartnerSetupClient.tsx','utf8');
const server=readFileSync('lib/sellerOnlinePartnerSetupServer.ts','utf8');
const api=readFileSync('app/api/partner/seller-online/route.ts','utf8');
const page=readFileSync('app/partner/seller-online/page.tsx','utf8');
const mainDomainGuide=readFileSync('app/seller-online-integration/page.tsx','utf8');

test('verified Seller Online vendor documentation provides exact key source and distinct notification addresses',()=>{
 assert.equal(SELLER_ONLINE_OFFICIAL_LINKS.sellerPersonalKey,
   'https://my.seller-online.com/personal_link.php');
 assert.equal(SELLER_ONLINE_OFFICIAL_LINKS.cmsGuide,
   'https://seller-online.com/help/integraciya-z-cms/');
 assert.equal(SELLER_ONLINE_OFFICIAL_LINKS.paypalIpn,
   'https://thefeya.com/api/commerce/paypal/ipn');
 assert.ok(ui.includes('«Настройки продаж»'));
 assert.ok(ui.includes('Данные для настройки CMS'));
 assert.ok(ui.includes('Order Created webhook Seller Online'));
 assert.ok(ui.includes('Это НЕ PayPal IPN'));
 assert.ok(ui.includes('Seller Online API v2'));
 assert.ok(ui.includes('для Next.js'));
});

test('technical onboarding does not suggest secret credentials needed for PayPal Standard',()=>{
 assert.ok(ui.includes("paypal_standard:['paypal_email','personal_key']"));
 assert.ok(ui.includes("paypal_rest:['paypal_client_id','paypal_client_secret']"));
 assert.ok(ui.includes("seller_online_api_v2:['seller_api_key']"));
 assert.ok(ui.includes('Для PayPal Standard не нужен'));
 assert.ok(ui.includes('через email или личный кабинет'));
 assert.ok(ui.includes('Сохранить параметры · оплату не включает'));
 assert.ok(!ui.includes("seller_webhook_url:'"));
 assert.ok(!ui.includes('Save payment configuration'));
 assert.ok(!ui.includes('payload.seller_webhook_url'));
});

test('saved configuration is never misreported as a verified payable checkout',()=>{
 const stored=sellerOnlineSetupProgress('paypal_standard',{
  paypal_email_set:true,personal_key_set:true,
 });
 assert.equal(stored.configurationSaved,true);
 assert.equal(stored.providerPaymentVerified,false);
 assert.equal(stored.endToEndPurchaseVerified,false);
 assert.equal(stored.livePaymentsActive,false);
 const missing=sellerOnlineSetupProgress('paypal_standard',{paypal_email_set:true});
 assert.deepEqual(missing.missing,['personal_key_set']);
 assert.equal(missing.configurationSaved,false);
 for(const kind of ['paypal_rest','seller_online_api_v2','hosted_redirect'] as const){
  assert.equal(sellerOnlineSetupProgress(kind,{}).livePaymentsActive,false);
 }
 assert.ok(ui.includes('Live payments: OFF'));
 assert.ok(ui.includes('оплату не включает'));
 assert.ok(server.includes("live_payment_enabled:false"));
 assert.ok(api.includes("saveSellerSetup("));
 assert.ok(page.includes('index:false,follow:false'));
});

test('primary-domain admin guide directs Seller Online to the live configuration route',()=>{
 assert.ok(mainDomainGuide.includes('href="/partner/seller-online"'));
 assert.ok(mainDomainGuide.includes('персональная ссылка'));
 assert.ok(mainDomainGuide.includes('пробную транзакцию'));
});
