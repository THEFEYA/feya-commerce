import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('owner-approved V13 public Shipping is routed ONLY from /shipping, canonical is preserved',()=>{
 const cfg=readFileSync('next.config.ts','utf8');
 const src=readFileSync('app/shipping-public-v13/page.tsx','utf8');
 assert.match(cfg,/source:'\\/shipping',destination:'\\/shipping-public-v13'/);
 assert.doesNotMatch(cfg,/source:'\\/contact',destination:/);
 assert.match(src,/releaseRobotsForPath\\('\\/shipping'\\)/);
 assert.match(src,/canonical:'\\/shipping'/);
 assert.doesNotMatch(src,/robots:\\{index:false,follow:false/);
 assert.match(src,/OwnerSellerOnlinePartnerDetails/);
 assert.match(src,/Standard Shipping/);
 assert.match(src,/Express Shipping/);
 assert.match(src,/€19/);
 assert.match(src,/€35/);
 assert.match(src,/6–9 working days/);
});

test('confirmed Seller Online address is visible on shipping only; frozen Contact/Footer unchanged',()=>{
 const provider=readFileSync('components/OwnerSellerOnlinePartnerDetails.tsx','utf8');
 const footer=readFileSync('components/Footer.tsx','utf8');
 const contact=readFileSync('app/contact/page.tsx','utf8');
 assert.match(provider,/SELLER_ONLINE_PROVIDER/);
 assert.match(provider,/op.contactAddress.line1/);
 assert.match(provider,/op.contactAddress.postalCode/);
 assert.match(provider,/Online payments on thefeya.com are not active yet/);
 assert.doesNotMatch(footer,/OwnerSellerOnlinePartnerDetails|public-site-prepayment-selleronline/);
 assert.doesNotMatch(contact,/OwnerSellerOnlinePartnerDetails/);
});
