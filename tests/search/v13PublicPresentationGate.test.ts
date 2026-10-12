import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isApprovedV13Presentation,PUBLIC_V13_PROJECT,PUBLIC_V13_BRANCH} from '../../lib/approvedV13Presentation.ts';

test('V13 public scope: right production project and exact SSO preview branch',()=>{
 const base={VERCEL:'1',VERCEL_PROJECT_ID:PUBLIC_V13_PROJECT};
 assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}),true);
 assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PUBLIC_V13_BRANCH}),true);
 assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'unapproved'}),false);
 assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PUBLIC_V13_BRANCH,FEYA_OWNER_PREVIEW_DISABLED:'true'}),false);
 assert.equal(isApprovedV13Presentation({...base,VERCEL_ENV:'production',VERCEL_PROJECT_ID:'wrong'}),false);
 assert.equal(isApprovedV13Presentation({VERCEL_ENV:'production'}),false);
});
test('V13 responsive shell preserves original product, SEO, legal and money truth',()=>{
 const template=readFileSync('app/template.tsx','utf8');
 const css=readFileSync('app/v13Public.css','utf8');
 const pdp=readFileSync('app/shop/[slug]/layout.tsx','utf8');
 const pdpCss=readFileSync('app/shop/[slug]/ownerPdpPolishV2.css','utf8');
 const cart=readFileSync('app/cart/page.tsx','utf8');
 const carousel=readFileSync('components/HomePieceCarousel.tsx','utf8');
 assert.ok(template.includes('isApprovedV13Presentation(process.env)'));
 assert.ok(template.includes('owner-visual-v2-root'));
 assert.ok(template.includes('OwnerShopFooterPreview'));
 assert.ok(css.includes('thefeya-approved-logo-transparent.webp'));
 assert.ok(css.includes('collection-related-links'));
 assert.ok(pdp.includes('OwnerPdpMobileInfoToggle'));
 assert.ok(pdpCss.includes(':has(> .owner-mobile-pdp-info-trigger) > div'));
 assert.ok(cart.includes('isApprovedV13Presentation(process.env)'));
 assert.ok(cart.includes('robots:{index:false,follow:false}'));
 assert.ok(readFileSync('components/CartOwnerLiveReviewClient.tsx','utf8').includes('Checkout not active'));
 assert.ok(carousel.includes('3000'));
 const footer=readFileSync('components/Footer.tsx','utf8');
 const contact=readFileSync('app/contact/page.tsx','utf8');
 assert.ok(!footer.includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(!contact.includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(!template.includes('FEYA_SEARCH_INDEXING_ENABLED'));
});
