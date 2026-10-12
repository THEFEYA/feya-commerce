import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('owner-approved V13 public Shipping is routed ONLY from /shipping and canonical is preserved',()=>{
 const cfg=readFileSync('next.config.ts','utf8');
 const src=readFileSync('app/shipping-public-v13/page.tsx','utf8');
 assert.ok(cfg.includes("source:'/shipping',destination:'/shipping-public-v13'"));
 assert.ok(!cfg.includes("source:'/contact',destination:"));
 assert.ok(src.includes("releaseRobotsForPath('/shipping')"));
 assert.ok(src.includes("canonical:'/shipping'"));
 assert.ok(!src.includes('robots:{index:false,follow:false'));
 for(const part of ['OwnerSellerOnlinePartnerDetails','Standard Shipping','Express Shipping','€19','€35','6–9 working days']){
   assert.ok(src.includes(part),part);
 }
});

test('Seller Online contact appears only inside approved Shipping component; Contact/Footer remain frozen',()=>{
 const provider=readFileSync('components/OwnerSellerOnlinePartnerDetails.tsx','utf8');
 const footer=readFileSync('components/Footer.tsx','utf8');
 const contact=readFileSync('app/contact/page.tsx','utf8');
 for(const part of ['SELLER_ONLINE_PROVIDER','op.contactAddress.line1','op.contactAddress.postalCode','Online payments on thefeya.com are not active yet']){
   assert.ok(provider.includes(part),part);
 }
 assert.ok(!footer.includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(!footer.includes('public-site-prepayment-selleronline'));
 assert.ok(!contact.includes('OwnerSellerOnlinePartnerDetails'));
});
