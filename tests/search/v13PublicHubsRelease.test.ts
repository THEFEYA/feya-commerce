import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isApprovedV13Presentation,PUBLIC_V13_PROJECT,PUBLIC_V13_HUB_BRANCH} from '../../lib/approvedV13Presentation.ts';

const file=(p:string)=>readFileSync(p,'utf8');

test('owner V13 Stage B needs verified project, production or exact protected owner preview',()=>{
 const env={VERCEL:'1',VERCEL_PROJECT_ID:PUBLIC_V13_PROJECT};
 assert.equal(isApprovedV13Presentation({...env,VERCEL_ENV:'production',VERCEL_GIT_COMMIT_REF:'main'}),true);
 assert.equal(isApprovedV13Presentation({...env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PUBLIC_V13_HUB_BRANCH}),true);
 assert.equal(isApprovedV13Presentation({...env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:'wrong'}),false);
 assert.equal(isApprovedV13Presentation({...env,VERCEL_ENV:'preview',VERCEL_GIT_COMMIT_REF:PUBLIC_V13_HUB_BRANCH,FEYA_OWNER_PREVIEW_DISABLED:'true'}),false);
});
test('public hub layouts preserve canonical page metadata and existing /shipping route',()=>{
 const config=file('next.config.ts');
 assert.ok(config.includes("source:'/shipping',destination:'/shipping-public-v13'"));
 assert.ok(config.includes('NEXT_PUBLIC_FEYA_V13_PUBLIC_DESIGN'));
 for(const name of ['events-performance','style','about','contact']){
   const layout=file('app/'+name+'/layout.tsx');
   const original=file('app/'+name+'/page.tsx');
   assert.ok(layout.includes('isApprovedV13Presentation(process.env)'),name);
   assert.ok(original.includes('releaseRobotsForPath'),name);
   assert.ok(original.includes("canonical:'/"+name+"'"),name);
 }
 for(const name of ['OwnerV13EventsHub','OwnerV13StyleHub']){
   const src=file('components/'+name+'.tsx');
   assert.ok(src.includes('OwnerDiscoveryTileStrip'));
   assert.ok(src.includes('OwnerHubSeoText'));
   assert.ok(!src.includes('robots:{index:false'),name);
   assert.ok(!src.includes('isOwnerUnifiedStorefrontPreview'),name);
 }
 assert.ok(file('components/OwnerDiscoveryTileStrip.tsx').includes('3000'));
 const catalog=file('lib/discoveryHubServer.ts');
 assert.ok(catalog.includes('OWNER_STYLE_HUB_TILES'));
 assert.ok(!catalog.includes('readOwnerRemoteCatalogPreviewV1'));
});
test('approved shop guide and ten owner collections do not alter Search v12 index ownership',()=>{
 const shop=file('app/shop/page.tsx');
 const faq=file('app/collections/[slug]/page.tsx');
 assert.ok(shop.includes('OwnerShopSeoText'));
 assert.ok(faq.includes('OwnerCollectionFaqAccordion'));
 assert.ok(faq.includes("releaseRobotsForPath"));
 assert.ok(faq.includes("readCachedSearchLandingRelease"));
 assert.ok(faq.includes('visualFaqPreview=isApprovedV13Presentation(process.env)'));
 const manifest=JSON.parse(file('config/product-os-ui-freeze.json'));
 assert.ok(typeof manifest.files['app/shop/page.tsx']==='string');
 assert.ok(file('config/ownerDiscoveryTilesV8.ts').includes('OWNER_EVENTS_HUB_TILES'));
 assert.ok(file('config/ownerDiscoveryTilesV8.ts').includes('OWNER_STYLE_HUB_TILES'));
});
test('Seller Online exists in public Shipping only; Contact contains no US office address',()=>{
 const contact=file('components/ContactExperienceV13Public.tsx');
 const map=file('components/OwnerLocationMapPreview.tsx');
 const shipping=file('app/shipping-public-v13/page.tsx');
 assert.ok(shipping.includes('OwnerSellerOnlinePartnerDetails'));
 assert.ok(!contact.includes('Seller-Online'));
 assert.ok(!contact.includes('635 Somers'));
 assert.ok(!contact.includes('Feasterville'));
 assert.ok(!map.includes('us-warehouse'));
 assert.ok(!map.includes('635 Somers'));
 assert.ok(!file('components/Footer.tsx').includes('OwnerSellerOnlinePartnerDetails'));
});
test('Contact mailto is honest and newsletter remains nonfunctional before consented CRM',()=>{
 const form=file('components/OwnerContactFormPreview.tsx');
 const news=file('components/OwnerNewsletterSignupPreview.tsx');
 assert.ok(form.includes('mailto:manager.feya@gmail.com'));
 assert.ok(form.includes('Please confirm sending'));
 assert.ok(!form.includes("Your email app was opened"));
 assert.ok(news.includes('Newsletter subscriptions are coming soon'));
 assert.ok(news.includes('button type="submit" disabled'));
 assert.ok(news.includes('No email addresses are being collected'));
 assert.ok(!news.includes('fetch('));
});
